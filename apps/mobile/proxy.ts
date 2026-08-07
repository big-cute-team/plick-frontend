/**
 * @file 세션 갱신 프록시. access 토큰이 만료됐지만 refresh가 남아있으면 네비게이션 도중
 * 조용히 토큰을 재발급해 로그인 상태를 잇는다. 실패하면 세션을 끊고 로그인 화면으로 보낸다.
 * BE 프록시(`/be/*`)로 나가는 브라우저 fetch에 Bearer 토큰을 실어 주는 일도 여기서 한다.
 *
 * 왜 이 자리인가: 평범한 GET 네비게이션 중에 **응답 쿠키를 심을 수 있는 유일한 자리**다.
 * 서버 액션은 POST(버튼 클릭)에 붙고, 서버 컴포넌트는 요청 쿠키를 읽기만 한다. 그래서 "페이지를
 * 여는 순간 토큰을 갈아끼우는" 일은 여기서 한다.
 *
 * 만료 판정: 현재 BE 토큰은 만료 정보가 없는 불투명 문자열이라 exp를 디코드할 수 없다. 대신
 * **access 쿠키의 수명(짧은 maxAge)을 만료 신호로 쓴다** — 브라우저가 그 쿠키를 버리면(=만료)
 * 요청에 access가 빠지고, refresh만 남은 그 상태가 "재발급해야 함"이다. (constants.ts TTL 참고)
 *
 * 파일 이름은 `middleware.ts`였다. Next 16에서 그 규칙이 deprecated되고 `proxy.ts`로
 * 이름이 바뀌어(export 이름도 `middleware` → `proxy`) dev 서버가 경고를 띄우길래 옮겼다.
 * 동작과 API는 그대로다 — Express 미들웨어와 헷갈리지 말라는 명칭 변경이다.
 */

import { NextResponse, type NextRequest } from "next/server";
import { BE_PROXY_PREFIX } from "@plick/core/client";
import { refreshTokensShared } from "@plick/core/refresh";
import {
  ACCESS_TOKEN_MAX_AGE,
  AUTH_COOKIE_BASE,
  AUTH_COOKIES,
  REFRESH_TOKEN_MAX_AGE,
} from "@/_constants/api";

/**
 * BE 프록시(`/be/*`)로 나가는 요청이면 access 토큰을 Bearer로 실어 통과시킨다.
 * 그 밖의 경로면 손대지 않고 통과시킨다.
 *
 * 왜 여기서 싣나: 브라우저 fetch(릴스 다음 페이지 등)는 HttpOnly 쿠키를 읽을 수
 * 없어 스스로 `Authorization` 헤더를 만들 수 없다. 쿠키는 same-origin이라 자동으로
 * 실려 오지만 BE는 쿠키가 아니라 Bearer 헤더만 본다. 그 사이를 잇는 자리가
 * 여기다 — `/be`를 BE로 넘기는 rewrites보다 먼저 돌고, 여기서 바꾼 요청 헤더가
 * 그대로 프록시 대상까지 간다. 서버 컴포넌트 fetch는 이 경로를 타지 않고 절대
 * URL로 직접 나가므로 호출부가 토큰을 넘긴다(`getAccessToken`).
 *
 * 안 실으면 조회 응답의 `likedByMe`가 항상 false로 와서, 좋아요를 누른 릴이
 * 다음 페이지로 다시 실려 올 때 하트가 빈 채로 보인다 (KAN-308).
 */
function authorized(request: NextRequest, accessToken: string): NextResponse {
  const headers = new Headers(request.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  return NextResponse.next({ request: { headers } });
}

export async function proxy(request: NextRequest) {
  const accessToken = request.cookies.get(AUTH_COOKIES.access)?.value;
  const refreshToken = request.cookies.get(AUTH_COOKIES.refresh)?.value;
  const isProxy = request.nextUrl.pathname.startsWith(BE_PROXY_PREFIX);

  /**
   * 손대지 않는 경우(프록시 요청이면 토큰만 실어 통과):
   * - access가 살아있음 → 아직 미만료.
   * - refresh가 없음 → 비로그인 탐색(둘러보기). 로그인 강제 금지.
   * - 로그인 화면 → 여기서 재발급/리다이렉트하면 루프·이상동작만 생긴다.
   * - OAuth 콜백 → 콜백 핸들러가 직접 새 토큰 쿠키를 심는다. 여기서도 심으면
   *   같은 쿠키에 Set-Cookie가 겹쳐 어느 값이 남을지 보장이 없다.
   */
  if (accessToken) {
    return isProxy ? authorized(request, accessToken) : NextResponse.next();
  }
  if (
    !refreshToken ||
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname.startsWith("/oauth")
  ) {
    return NextResponse.next();
  }

  try {
    /**
     * 재발급은 같은 토큰끼리 한 번으로 묶는다 (KAN-379). access 쿠키가 만료된
     * 직후에는 요청 여러 개가 동시에 여기 닿는데, BE 재발급이 회전 방식이라
     * 각자 부르면 하나만 성공하고 나머지는 401 → 아래 catch가 멀쩡한 세션을
     * 끊어 버린다.
     */
    const tokens = await refreshTokensShared(refreshToken);

    /**
     * 요청 쿠키에도 심어 이번 네비게이션의 다운스트림 렌더(서버 컴포넌트)가 새 access를 보게 하고,
     * 응답 쿠키에도 심어 브라우저가 회전된 쌍을 저장하게 한다(각자의 TTL로).
     */
    request.cookies.set(AUTH_COOKIES.access, tokens.accessToken);
    request.cookies.set(AUTH_COOKIES.refresh, tokens.refreshToken);
    const response = isProxy
      ? authorized(request, tokens.accessToken)
      : NextResponse.next({ request });
    response.cookies.set(AUTH_COOKIES.access, tokens.accessToken, {
      ...AUTH_COOKIE_BASE,
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });
    response.cookies.set(AUTH_COOKIES.refresh, tokens.refreshToken, {
      ...AUTH_COOKIE_BASE,
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });
    return response;
  } catch {
    /**
     * refresh도 만료/무효 → 세션 종료. 쿠키를 지우고 로그인으로 보낸다. 쿠키가 사라지므로
     * 리다이렉트된 다음 요청은 refresh 없음 → 위 가드에서 통과, 루프 없다.
     *
     * 프록시 요청은 리다이렉트하지 않는다 — 응답을 JSON으로 읽는 fetch에 로그인
     * 페이지 HTML을 물리면 파싱 에러로 죽는다. 쿠키만 지우고 익명으로 통과시켜
     * 공개 조회는 그대로 뜨게 두고, 보호 API면 BE가 401을 준다.
     */
    const response = isProxy
      ? NextResponse.next()
      : NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(AUTH_COOKIES.access);
    response.cookies.delete(AUTH_COOKIES.refresh);
    return response;
  }
}

export const config = {
  /**
   * 페이지 네비게이션과 BE 프록시(`/be/*`)에. api 라우트·_next 내부·정적
   * 파일(확장자 포함 경로)은 제외.
   */
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};

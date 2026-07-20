/**
 * @file 세션 갱신 미들웨어. access 토큰이 만료됐지만 refresh가 남아있으면 네비게이션 도중
 * 조용히 토큰을 재발급해 로그인 상태를 잇는다. 실패하면 세션을 끊고 로그인 화면으로 보낸다.
 *
 * 왜 미들웨어인가: 평범한 GET 네비게이션 중에 **응답 쿠키를 심을 수 있는 유일한 자리**가 미들웨어다.
 * 서버 액션은 POST(버튼 클릭)에 붙고, 서버 컴포넌트는 요청 쿠키를 읽기만 한다. 그래서 "페이지를
 * 여는 순간 토큰을 갈아끼우는" 일은 여기서 한다.
 *
 * 만료 판정: 현재 BE 토큰은 만료 정보가 없는 불투명 문자열이라 exp를 디코드할 수 없다. 대신
 * **access 쿠키의 수명(짧은 maxAge)을 만료 신호로 쓴다** — 브라우저가 그 쿠키를 버리면(=만료)
 * 요청에 access가 빠지고, refresh만 남은 그 상태가 "재발급해야 함"이다. (constants.ts TTL 참고)
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_TOKEN_MAX_AGE,
  AUTH_COOKIE_BASE,
  AUTH_COOKIES,
  REFRESH_TOKEN_MAX_AGE,
} from "@/_lib/api/constants";
import { refreshTokens } from "@/_lib/api/refresh";

export async function middleware(request: NextRequest) {
  const hasAccess = request.cookies.has(AUTH_COOKIES.access);
  const refreshToken = request.cookies.get(AUTH_COOKIES.refresh)?.value;

  /**
   * 손대지 않는 경우:
   * - access가 살아있음 → 아직 미만료.
   * - refresh가 없음 → 비로그인 탐색(둘러보기). 로그인 강제 금지.
   * - 로그인 화면 → 여기서 재발급/리다이렉트하면 루프·이상동작만 생긴다.
   * - OAuth 콜백 → 콜백 핸들러가 직접 새 토큰 쿠키를 심는다. 여기서도 심으면
   *   같은 쿠키에 Set-Cookie가 겹쳐 어느 값이 남을지 보장이 없다.
   */
  if (
    hasAccess ||
    !refreshToken ||
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname.startsWith("/oauth")
  ) {
    return NextResponse.next();
  }

  try {
    const tokens = await refreshTokens(refreshToken);

    /**
     * 요청 쿠키에도 심어 이번 네비게이션의 다운스트림 렌더(서버 컴포넌트)가 새 access를 보게 하고,
     * 응답 쿠키에도 심어 브라우저가 회전된 쌍을 저장하게 한다(각자의 TTL로).
     */
    request.cookies.set(AUTH_COOKIES.access, tokens.accessToken);
    request.cookies.set(AUTH_COOKIES.refresh, tokens.refreshToken);
    const response = NextResponse.next({ request });
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
     */
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(AUTH_COOKIES.access);
    response.cookies.delete(AUTH_COOKIES.refresh);
    return response;
  }
}

export const config = {
  /** 페이지 네비게이션에만. api·_next 내부·정적 파일(확장자 포함 경로)은 제외. */
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};

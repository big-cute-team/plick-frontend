/**
 * @file 세션 프록시. 토큰이 없으면 게스트를 발급하고(KAN-514), access 토큰이 만료됐지만
 * refresh가 남아있으면 네비게이션 도중 조용히 재발급해 세션을 잇는다. 재발급이 진짜로
 * 실패하면 게스트는 새 게스트로 다시 시작하고, 소셜 세션은 끊어 로그인 화면으로 보낸다.
 * BE 프록시(`/be/*`)로 나가는 브라우저 fetch에 Bearer 토큰을 실어 주는 일도 여기서 한다.
 * 모바일 `proxy.ts`와 같은 로직이다(KAN-318) — refresh·guest fetcher는 `@plick/core` 공용.
 *
 * 왜 이 자리인가: 평범한 GET 네비게이션 중에 **응답 쿠키를 심을 수 있는 유일한 자리**다.
 * 서버 액션은 POST(버튼 클릭)에 붙고, 서버 컴포넌트는 요청 쿠키를 읽기만 한다. 그래서 "페이지를
 * 여는 순간 토큰을 갈아끼우는" 일은 여기서 한다.
 *
 * 만료 판정: BE access 토큰은 exp가 담긴 JWT지만 여기서 디코드하지 않는다. 대신
 * **access 쿠키의 수명(토큰 TTL보다 5분 짧은 maxAge)을 만료 신호로 쓴다** — 브라우저가 그
 * 쿠키를 버리면 요청에 access가 빠지고, refresh만 남은 그 상태가 "재발급해야 함"이다.
 * 디코드보다 신호가 단순하고, 시계 오차로 만료 임박 토큰을 싣는 일도 없다. (constants.ts TTL 참고)
 *
 * 파일 이름은 `middleware.ts`였다. Next 16에서 그 규칙이 deprecated되고 `proxy.ts`로
 * 이름이 바뀌어(export 이름도 `middleware` → `proxy`) dev 서버가 경고를 띄우길래 옮겼다.
 * 동작과 API는 그대로다 — Express 미들웨어와 헷갈리지 말라는 명칭 변경이다.
 */

import { NextResponse, type NextRequest } from "next/server";
import { ApiError, BE_PROXY_PREFIX } from "@plick/core/client";
import { issueGuest } from "@plick/core/guest";
import { refreshTokensShared } from "@plick/core/refresh";
import {
  ACCESS_TOKEN_MAX_AGE,
  AUTH_COOKIE_BASE,
  AUTH_COOKIES,
  CRAWLER_UA_PATTERN,
  GUEST_EXPIRES_COOKIE,
  GUEST_NOTICE,
  GUEST_NOTICE_COOKIE,
  GUEST_NOTICE_MAX_AGE,
  REFRESH_RETRY_COOKIE,
  REFRESH_RETRY_MAX_AGE,
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

/**
 * 게스트를 발급할 자리가 아닌 경로 (KAN-514).
 *
 * `/oauth`는 콜백이 직접 새 토큰 쿠키를 심는 구간이라 건드리면 Set-Cookie가 겹친다.
 * `/login`·`/signup`을 빼는 이유는 따로다 — 이 화면에 토큰 없이 닿는 사람은 방금
 * 로그아웃했거나 로그인하러 직접 들어온 **기존 소셜 사용자**다. 여기서 게스트를
 * 쥐어 주면 소셜 버튼이 연동(`/auth/link`) 갈래로 가고, 기록이 빈 새 게스트를 옛
 * 계정에 붙이려다 `EXISTING_ACCOUNT`로 떨어져 "이미 가입된 계정이라 활동이 이어지지
 * 않아요"라는 엉뚱한 안내를 보게 된다. 앱 안에서 넘어온 게스트는 이미 토큰이 있어
 * 이 분기에 닿지 않으므로 연동 갈래가 그대로 유지된다.
 */
function skipsGuestIssue(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/oauth")
  );
}

/**
 * 게스트 세션을 열고 이번 응답에 쿠키를 심는다 (KAN-514).
 *
 * 요청 쿠키에도 같이 심는 이유는 재발급 경로와 같다 — 이번 네비게이션의 서버
 * 컴포넌트(`isLoggedIn`·`getMyProfile`)가 방금 받은 토큰을 보게 하려면 응답만으로는
 * 늦다. 응답 쿠키는 브라우저가 다음 요청부터 실어 보내게 하는 몫이다.
 *
 * 발급이 실패하면(BE 다운, 429 `COMMON_RATE_LIMITED`) 삼키고 익명으로 통과시킨다.
 * 게스트는 참여를 앞당기는 편의지 열람의 전제가 아니라서, 여기서 막으면 읽기만
 * 하려던 사람까지 빈 화면을 보게 된다. 다음 네비게이션이 다시 시도한다.
 */
async function startGuestSession(request: NextRequest): Promise<NextResponse> {
  let guest;
  try {
    guest = await issueGuest();
  } catch (e) {
    console.error("[guest] 게스트 발급 실패:", e);
    /* 마감된 게스트를 갈아끼우려던 길이었다면 죽은 쿠키가 남아 다음 네비게이션이
       또 재발급 401을 맞는다. 지워서 다음 진입이 깨끗한 발급으로 시작하게 한다 */
    const failed = NextResponse.next();
    failed.cookies.delete(AUTH_COOKIES.access);
    failed.cookies.delete(AUTH_COOKIES.refresh);
    failed.cookies.delete(GUEST_EXPIRES_COOKIE);
    failed.cookies.delete(REFRESH_RETRY_COOKIE);
    return failed;
  }

  request.cookies.set(AUTH_COOKIES.access, guest.accessToken);
  request.cookies.set(AUTH_COOKIES.refresh, guest.refreshToken);
  request.cookies.set(GUEST_EXPIRES_COOKIE, guest.guestExpiresAt);
  request.cookies.delete(REFRESH_RETRY_COOKIE);

  const response = NextResponse.next({ request });
  response.cookies.set(AUTH_COOKIES.access, guest.accessToken, {
    ...AUTH_COOKIE_BASE,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  response.cookies.set(AUTH_COOKIES.refresh, guest.refreshToken, {
    ...AUTH_COOKIE_BASE,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
  response.cookies.set(GUEST_EXPIRES_COOKIE, guest.guestExpiresAt, {
    ...AUTH_COOKIE_BASE,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
  /* 첫 진입 안내 토스트를 띄울 표식 — 띄운 클라 컴포넌트가 지운다(HttpOnly 아님) */
  response.cookies.set(GUEST_NOTICE_COOKIE, GUEST_NOTICE.issued, {
    ...AUTH_COOKIE_BASE,
    httpOnly: false,
    maxAge: GUEST_NOTICE_MAX_AGE,
  });
  response.cookies.delete(REFRESH_RETRY_COOKIE);
  return response;
}

export async function proxy(request: NextRequest) {
  const accessToken = request.cookies.get(AUTH_COOKIES.access)?.value;
  const refreshToken = request.cookies.get(AUTH_COOKIES.refresh)?.value;
  const isProxy = request.nextUrl.pathname.startsWith(BE_PROXY_PREFIX);

  /* access가 살아있음 → 아직 미만료. 프록시 요청이면 토큰만 실어 통과시킨다 */
  if (accessToken) {
    return isProxy ? authorized(request, accessToken) : NextResponse.next();
  }

  /**
   * 토큰이 하나도 없는 첫 진입 — 여기서 게스트를 발급한다 (KAN-514).
   *
   * 예전에는 이 자리가 "비로그인 탐색이니 손대지 않는다"였다. 게스트를 깔면서
   * 뜻이 바뀌었다 — 들어오는 순간 계정을 쥐어 줘야 좋아요·투표·조회 기록이 첫
   * 탭부터 먹는다. 발급이 **페이지 네비게이션에서만** 일어나는 건 그래야 응답
   * 쿠키를 심을 수 있어서다. `/be` 프록시 요청은 이미 토큰이 생긴 뒤에 나가므로
   * 여기 걸릴 일이 없고, 걸리더라도 그냥 익명으로 통과시킨다.
   *
   * 크롤러는 제외한다 — 이유는 `CRAWLER_UA_PATTERN` 주석에 적어 뒀다.
   */
  if (!refreshToken) {
    if (
      isProxy ||
      skipsGuestIssue(request.nextUrl.pathname) ||
      CRAWLER_UA_PATTERN.test(request.headers.get("user-agent") ?? "")
    ) {
      return NextResponse.next();
    }
    return startGuestSession(request);
  }

  /**
   * refresh만 남았지만 재발급하지 않는 자리:
   * - 로그인 화면 → 여기서 재발급/리다이렉트하면 루프·이상동작만 생긴다.
   * - OAuth 콜백 → 콜백 핸들러가 직접 새 토큰 쿠키를 심는다. 여기서도 심으면
   *   같은 쿠키에 Set-Cookie가 겹쳐 어느 값이 남을지 보장이 없다.
   */
  if (
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
    /**
     * 게스트 세션이면 마감 시각이 함께 온다 (KAN-514). 값은 고정이라 늘 같지만,
     * 쿠키 수명을 다시 늘려 줘야 14일 내내 안내가 뜬다. 소셜 세션이면 안 실려
     * 오므로 남아 있던 표식을 지운다 — 연동 직후처럼 갈래가 바뀐 경우의 뒷정리다.
     */
    if (tokens.guestExpiresAt) {
      request.cookies.set(GUEST_EXPIRES_COOKIE, tokens.guestExpiresAt);
    } else {
      request.cookies.delete(GUEST_EXPIRES_COOKIE);
    }
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
    if (tokens.guestExpiresAt) {
      response.cookies.set(GUEST_EXPIRES_COOKIE, tokens.guestExpiresAt, {
        ...AUTH_COOKIE_BASE,
        maxAge: REFRESH_TOKEN_MAX_AGE,
      });
    } else {
      response.cookies.delete(GUEST_EXPIRES_COOKIE);
    }
    return response;
  } catch (e) {
    /**
     * 재발급 실패가 곧 세션 만료는 아니다 — 종류를 갈라 처리한다.
     *
     * 401이 아니면(BE 5xx·네트워크) 토큰이 무효라는 증거가 없다. 쿠키를 지우지 않고
     * 익명으로 통과시켜, BE가 살아난 뒤의 내비게이션이 재발급을 이어받게 한다.
     *
     * 401이어도 바로 끊지 않는다. 프로덕션 FE는 인스턴스 2대라 access 만료 직후
     * 버스트 요청이 서로 다른 인스턴스에서 같은 refresh 토큰으로 재발급을 부르고,
     * 1회용 회전에서 진 쪽이 401을 받는다 — 세션은 멀쩡하다. 인스턴스 안 동시성은
     * KAN-379의 공유 재발급이 덮지만, 인스턴스 사이는 메모리가 갈라져 못 덮는다.
     * - `/be` fetch는 쿠키를 안 지우고 익명 통과. 공개 조회는 뜨고, 보호 API면 BE가
     *   401을 준다. 조용한 fetch 하나가 세션을 지우던 구멍을 막는다.
     * - 페이지 요청은 같은 URL로 1회 재시도 리다이렉트. 이긴 형제의 Set-Cookie가
     *   그사이 브라우저에 저장돼 재시도는 새 access를 달고 통과한다. 가드 쿠키가
     *   "1회"를 세므로 진짜 만료면 두 번째 401에서 쿠키를 지우고 로그인으로 보낸다.
     */
    const invalid = e instanceof ApiError && e.status === 401;
    if (!invalid || isProxy) {
      return NextResponse.next();
    }
    if (!request.cookies.has(REFRESH_RETRY_COOKIE)) {
      const response = NextResponse.redirect(request.nextUrl);
      response.cookies.set(REFRESH_RETRY_COOKIE, "1", {
        ...AUTH_COOKIE_BASE,
        maxAge: REFRESH_RETRY_MAX_AGE,
      });
      return response;
    }
    /**
     * 두 번째 401이면 진짜 만료다. 게스트였다면(마감 쿠키가 그 표식이다) 로그인
     * 화면이 아니라 **새 게스트로 다시 시작한다** (KAN-514). 게스트에게 로그인을
     * 요구하는 건 처음부터 로그인을 안 시키려던 취지와 정반대고, 마감은 재발급으로
     * 늘어나지 않으니 14일이 지난 사람은 전부 이 길로 온다. 옛 게스트의 기록은
     * 그 계정에 남지만 다시 연결되지는 않는다 — BE가 정한 1차 범위다.
     */
    if (request.cookies.has(GUEST_EXPIRES_COOKIE)) {
      return startGuestSession(request);
    }
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(AUTH_COOKIES.access);
    response.cookies.delete(AUTH_COOKIES.refresh);
    response.cookies.delete(REFRESH_RETRY_COOKIE);
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

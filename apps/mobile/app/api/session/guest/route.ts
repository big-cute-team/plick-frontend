import { NextResponse, type NextRequest } from "next/server";
import {
  ANALYTICS_HEADERS,
  BOT_HEADER_VALUE,
  DEVICE_ID_COOKIE,
  DIRECT_PATH,
  E2E_COOKIE,
  PATH_COOKIE,
  isBotRequest,
  isDeviceId,
  isPathValue,
  resolveBrowserKind,
} from "@plick/core/analytics";
import {
  MARKETING_COOKIE,
  marketingHeaders,
  resolveRequestMarketing,
} from "@plick/core/marketing";
import { issueGuest } from "@plick/core/guest";
import { viewerForwardedHeaders } from "@plick/core/viewer-ip";
import {
  ACCESS_TOKEN_MAX_AGE,
  AUTH_COOKIE_BASE,
  AUTH_COOKIES,
  CRAWLER_UA_PATTERN,
  GUEST_EXPIRES_COOKIE,
  GUEST_FROM_LOGOUT_COOKIE,
  GUEST_NOTICE,
  GUEST_NOTICE_COOKIE,
  GUEST_NOTICE_MAX_AGE,
  REFRESH_RETRY_COOKIE,
  REFRESH_TOKEN_MAX_AGE,
  SESSION_COOKIE_BASE,
  SESSION_KIND,
  SESSION_KIND_COOKIE,
} from "@/_constants/api";
import { PLICK_CLIENT } from "@/_constants/analytics";

/** 이 라우트의 응답은 사람마다 다르다. 어디에도 저장하지 않게 못 박는다 */
const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * 게스트 발급 (KAN-514, KAN-665). 브라우저가 화면을 띄운 뒤 한가할 때, 또는 발급 전에 좋아요·투표·
 * 댓글을 누르면 부른다(`AuthProvider`의 `ensureSession`).
 *
 * 전에는 프록시가 쿠키 없는 페이지 요청마다 발급해 그 페이지 응답에 토큰을 심었다. 페이지가 정적·ISR이
 * 되면서(KAN-632, KAN-664) 그 응답은 "누구에게나 같다"(`s-maxage`)고 말하는데 토큰이 실려 있어
 * CDN이 저장하면 한 사람의 토큰이 다음 사람에게 나간다. 그래서 발급을 이 POST로 떼었다. CDN은 POST
 * 응답을 저장하지 않는다. curl이나 링크 미리보기처럼 JS를 돌리지 않는 요청은 이제 게스트를 만들지 않는다.
 *
 * `proxy.ts` matcher가 `api`를 빼므로 프록시를 타지 않는다. 그래서 분석 헤더(KAN-542)도 여기서
 * 쿠키로 직접 조립한다. 유입 경로와 마케팅은 쿠키 값만 쓴다. 첫 `/be` 호출보다 발급이 먼저면
 * 랜딩 쿠키가 아직 풀리기 전이라 `guest_issued` 이벤트의 유입 경로가 `direct`로 남는다.
 *
 * 거르는 요청:
 * - 크롤러 UA: 프록시가 발급하던 때와 같은 규칙이다(`CRAWLER_UA_PATTERN`). JS를 돌리는 구글봇도
 *   브라우저 쪽 발급을 부를 수 있어 여기서도 막는다.
 * - 다른 사이트에서 온 POST: 같은 출처가 아니면 거절한다(`isSameOrigin`). 남의 페이지가 폼으로
 *   이 주소를 때려 방문자 브라우저에 게스트를 심는 걸 막는다.
 * - 이미 세션이 있는 요청: 발급하지 않고 `issued: false`로 답한다. 다른 탭이 먼저 받아 간 경우거나,
 *   세션 표식(`sessionKind`)이 생기기 전(KAN-632 이전)에 받은 세션이다. 뒤의 경우는 표식만 심어 준다.
 *
 * 발급이 실패하면(BE 다운, 429, 1.5초 상한) 503으로 답하고 쿠키는 건드리지 않는다. 브라우저는 다음
 * 화면이나 다음 탭에서 다시 시도한다.
 *
 * 남용 방어는 위 두 거름 말고 FE에 따로 두지 않는다(KAN-675). 발급 상한은 BE의 같은 IP 분당 60회
 * (`auth-guest`)인데, 이 라우트가 BE를 서버에서 부르므로 BE 내부 ALB가 적는 IP는 FE 인스턴스다.
 * 그래서 KAN-680 전에는 상한이 사람별이 아니라 인스턴스당 분당 60회 공용이었고, prod에서 쿠키 없는
 * 스캐너 한 대가 바구니를 비워 429가 난 날이 실제로 있었다(ADR 0216). 지금은 CloudFront가 적어 준
 * `CloudFront-Viewer-Address`를 `X-Forwarded-For`로 실어 BE가 방문자별로 센다(`viewerForwardedHeaders`).
 * 들어온 `X-Forwarded-For` 체인은 첫 값을 요청자가 지어낼 수 있어 넘기지 않는다. 헤더가 없으면
 * (로컬, 정책 미적용 배포) 안 실어 예전과 같은 공용 상한으로 남는다. FE 인스턴스 메모리에 상한을
 * 두는 건 인스턴스가 여럿이라 이득이 없다.
 */
export async function POST(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") ?? "";
  const isCrawler = CRAWLER_UA_PATTERN.test(userAgent);
  if (isCrawler || !isSameOrigin(request)) {
    return new NextResponse(null, { status: 403, headers: NO_STORE });
  }
  if (
    request.cookies.has(AUTH_COOKIES.access) ||
    request.cookies.has(AUTH_COOKIES.refresh)
  ) {
    const existing = NextResponse.json(
      { issued: false },
      { headers: NO_STORE },
    );
    /* 토큰은 있는데 세션 표식이 없으면 KAN-632 전에 받은 세션이다. 마감 쿠키가 게스트 표식이라
       그걸로 종류를 정해 심는다. 안 심으면 브라우저는 세션이 없다고 보고 좋아요에 로그인 팝업을 띄운다 */
    if (!request.cookies.has(SESSION_KIND_COOKIE)) {
      existing.cookies.set(
        SESSION_KIND_COOKIE,
        request.cookies.has(GUEST_EXPIRES_COOKIE)
          ? SESSION_KIND.guest
          : SESSION_KIND.user,
        { ...SESSION_COOKIE_BASE, maxAge: REFRESH_TOKEN_MAX_AGE },
      );
    }
    return existing;
  }

  let guest;
  try {
    guest = await issueGuest({
      ...analyticsHeaders(request, userAgent, isCrawler),
      /* 방문자 IP를 BE 상한의 주체로 (KAN-680). CloudFront 헤더가 없으면 안 싣는다 */
      ...viewerForwardedHeaders(request.headers),
    });
  } catch (e) {
    console.error("[guest] 게스트 발급 실패:", e);
    return NextResponse.json(
      { issued: false },
      { status: 503, headers: NO_STORE },
    );
  }

  const response = NextResponse.json({ issued: true }, { headers: NO_STORE });
  response.cookies.set(AUTH_COOKIES.access, guest.accessToken, {
    ...AUTH_COOKIE_BASE,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  response.cookies.set(AUTH_COOKIES.refresh, guest.refreshToken, {
    ...AUTH_COOKIE_BASE,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
  /* 마감 시각과 세션 종류는 브라우저가 읽는다 (KAN-632). 옵션 설명은 `SESSION_KIND_COOKIE` 주석 */
  response.cookies.set(GUEST_EXPIRES_COOKIE, guest.guestExpiresAt, {
    ...SESSION_COOKIE_BASE,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
  response.cookies.set(SESSION_KIND_COOKIE, SESSION_KIND.guest, {
    ...SESSION_COOKIE_BASE,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
  /* 첫 진입 안내 토스트를 띄울 표식. 띄운 클라 컴포넌트가 지운다(HttpOnly 아님) */
  response.cookies.set(GUEST_NOTICE_COOKIE, GUEST_NOTICE.issued, {
    ...AUTH_COOKIE_BASE,
    httpOnly: false,
    maxAge: GUEST_NOTICE_MAX_AGE,
  });
  /* 자연 발급한 게스트는 로그아웃 출신이 아니다 (KAN-658) */
  if (request.cookies.has(REFRESH_RETRY_COOKIE)) {
    response.cookies.delete(REFRESH_RETRY_COOKIE);
  }
  if (request.cookies.has(GUEST_FROM_LOGOUT_COOKIE)) {
    response.cookies.delete(GUEST_FROM_LOGOUT_COOKIE);
  }
  return response;
}

/**
 * 게스트 발급 호출에 실을 분석 헤더 (KAN-542). BE가 `guest_issued` 이벤트에 기기·유입을 남긴다.
 * 프록시의 `resolveAnalytics`와 같은 값을 쿠키에서만 읽는다. 쿠키를 새로 심지는 않는다.
 *
 * @param request 이번 요청
 * @param userAgent 요청 UA
 * @param isCrawler 크롤러 UA인가
 */
function analyticsHeaders(
  request: NextRequest,
  userAgent: string,
  isCrawler: boolean,
): Record<string, string> {
  const storedPath = request.cookies.get(PATH_COOKIE)?.value;
  const { marketing } = resolveRequestMarketing({
    cookie: request.cookies.get(MARKETING_COOKIE)?.value,
    searchParams: new URLSearchParams(),
    referer: null,
    ownHost: request.nextUrl.hostname,
    isProxy: true,
    isCrawler,
  });
  const headers: Record<string, string> = {
    [ANALYTICS_HEADERS.path]: isPathValue(storedPath)
      ? storedPath
      : DIRECT_PATH,
    [ANALYTICS_HEADERS.client]: PLICK_CLIENT,
    [ANALYTICS_HEADERS.browser]: resolveBrowserKind(userAgent),
    ...marketingHeaders(marketing),
  };
  const device = request.cookies.get(DEVICE_ID_COOKIE)?.value;
  if (isDeviceId(device)) headers[ANALYTICS_HEADERS.device] = device;
  if (
    isBotRequest({ isCrawler, hasE2eCookie: request.cookies.has(E2E_COOKIE) })
  ) {
    headers[ANALYTICS_HEADERS.bot] = BOT_HEADER_VALUE;
  }
  return headers;
}

/**
 * 같은 출처에서 온 요청인가. `Sec-Fetch-Site`가 있으면 그것을 믿고, 없는 옛 브라우저·웹뷰면 `Origin`의
 * 호스트를 요청 `Host`와 맞춘다. 브라우저는 POST fetch에 `Origin`을 늘 싣는다. 둘 다 없으면 거절한다.
 * `Host`는 CloudFront가 오리진 요청 정책(AllViewer)으로 그대로 넘긴다.
 *
 * @param request 이번 요청
 */
function isSameOrigin(request: NextRequest): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site !== null) return site === "same-origin";
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

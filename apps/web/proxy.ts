/**
 * @file 세션 프록시. access 토큰이 만료됐지만 refresh가 남아있으면 네비게이션 도중 조용히
 * 재발급해 세션을 잇는다. 재발급이 진짜로 실패하면 게스트는 쿠키를 지워 브라우저가 새 게스트를
 * 받게 하고, 소셜 세션은 끊어 로그인 화면으로 보낸다. BE 프록시(`/be/*`)로 나가는 브라우저 fetch에
 * Bearer 토큰을 실어 주는 일도 여기서 한다. 모바일 `proxy.ts`와 같은 로직이다(KAN-318) —
 * refresh fetcher는 `@plick/core` 공용.
 *
 * 게스트 발급은 KAN-667(모바일 KAN-665)부터 여기서 하지 않는다. 쿠키 없는 페이지 요청마다 발급해
 * 그 페이지 응답에 토큰을 심었는데, 페이지가 정적·ISR이 되면서 그 응답을 CDN이 저장하면 한 사람의
 * 토큰이 다음 사람에게 나간다. 발급은 브라우저가 `POST /api/session/guest`로 받아 간다
 * (`AuthProvider`). 같은 이유로 이 프록시는 다음 규칙을 지킨다. 페이지 응답에는 되도록 쿠키를
 * 심지 않고, 심을 수밖에 없는 응답(토큰 재발급, 진입 화면 일회용 쿠키 소모)은
 * `Cache-Control: private, no-store`로 덮어 어디에도 저장되지 않게 한다(`proxy` 끝의 안전핀).
 *
 * 분석 헤더(KAN-542)도 여기서 정한다. 유입 경로(`plick_path`)와 마케팅 유입(`plick_mkt`, KAN-577)
 * 쿠키를 심고, 메인 API로 가는 요청 헤더에 `X-Plick-Device`·
 * `X-Plick-Path`·`X-Plick-Client`·`X-Plick-Entry`와 utm·리퍼러·클릭 식별자 헤더 여섯 개,
 * 크롤러와 E2E를 가르는 `X-Plick-Bot`(KAN-607), UA로 가른 인앱 브라우저 종류 `X-Plick-Browser`(KAN-610)를 찍는다.
 * 브라우저 `/be` fetch는 그 헤더가 rewrites를 타고 BE까지 그대로 가고,
 * 페이지 요청은 서버 컴포넌트가 `headers()`로 읽어 서버 측 `apiFetch`에 옮겨 싣는다
 * (`_services/analytics-headers.ts`). 값을 정하는 자리가 하나라 두 경로가 어긋나지 않는다.
 *
 * 왜 이 자리인가: 평범한 GET 네비게이션 중에 **응답 쿠키를 심을 수 있는 유일한 자리**다.
 * 서버 액션은 POST(버튼 클릭)에 붙고, 서버 컴포넌트는 요청 쿠키를 읽기만 한다. 그래서 "페이지를
 * 여는 순간 토큰을 갈아끼우는" 일은 여기서 한다. 기기 식별자와 유입 쿠키는 KAN-667부터 페이지
 * 응답이 아니라 브라우저(`deviceSyncScript`)와 첫 `/be` 응답이 심는다.
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
import {
  ANALYTICS_COOKIE_MAX_AGE,
  ANALYTICS_HEADERS,
  BOT_HEADER_VALUE,
  type BrowserKind,
  DEVICE_ID_COOKIE,
  DIRECT_PATH,
  E2E_COOKIE,
  ENTRY_COOKIE,
  LANDING_COOKIE,
  PATH_COOKIE,
  isAnalyticsWrite,
  isBotRequest,
  isDeviceId,
  isPathValue,
  parseLandingCookie,
  readPathParam,
  resolveBrowserKind,
  resolveRequestEntry,
} from "@plick/core/analytics";
import {
  MARKETING_COOKIE,
  marketingHeaders,
  resolveRequestMarketing,
} from "@plick/core/marketing";
import { ApiError, BE_PROXY_PREFIX } from "@plick/core/client";
import {
  LIVE_PAUSED_PATH,
  LIVE_SCORE_PAUSED,
  isLiveScorePath,
} from "@plick/domain/live-pause";
import { refreshTokensShared } from "@plick/core/refresh";
import {
  ACCESS_TOKEN_MAX_AGE,
  AUTH_COOKIE_BASE,
  AUTH_COOKIES,
  CRAWLER_UA_PATTERN,
  GUEST_EXPIRES_COOKIE,
  GUEST_FROM_LOGOUT_COOKIE,
  REFRESH_RETRY_COOKIE,
  REFRESH_RETRY_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
  SESSION_COOKIE_BASE,
  SESSION_KIND,
  SESSION_KIND_COOKIE,
} from "@/_constants/api";
import { PLICK_CLIENT } from "@/_constants/analytics";

/**
 * 이번 요청의 분석 값 (KAN-542). 프록시 맨 앞에서 한 번 정하고, 나가는 요청 헤더와 이번
 * 응답에 심을 쿠키 양쪽에 같은 값을 쓴다.
 */
interface Analytics {
  /** 메인 API로 가는 요청에 실을 헤더. 모르는 값은 키를 빼서 BE가 `unknown`으로 접게 둔다 */
  headers: Record<string, string>;
  /** 이번 응답에 새로 심거나 갱신할 쿠키. 값이 그대로면 비어 있어 Set-Cookie가 안 나간다. 값이 빈 문자열이면 지운다 */
  cookies: { name: string; value: string; httpOnly: boolean }[];
}

/**
 * 쿠키와 URL에서 분석 값을 정한다 (KAN-542, KAN-577).
 *
 * 기기 식별자: 쿠키에서 온 값만 헤더에 싣는다(KAN-607). 새 식별자는 KAN-667부터 프록시가 아니라
 * `<head>`의 `deviceSyncScript`가 만들어 쿠키와 localStorage에 적는다. 전환 배너가 쿼리(`?did=`)로
 * 넘긴 값도 거기서 받는다. 페이지 응답에 심으면 CDN이 그 응답을 남에게 줄 수 없어서 옮겼다. 첫
 * 서버 렌더링 이벤트 하나만 기기 없이 남는 건 전과 같다(새 값은 원래 다음 요청부터 실렸다).
 *
 * 봇 표시(KAN-607): 크롤러이거나 E2E 쿠키(`plick_e2e`)가 있으면 `X-Plick-Bot: 1`. BE가 그 요청의
 * 이벤트를 `is_bot = true`로 남긴다. 페이지 요청의 서버 렌더링 호출과 `/be` fetch 둘 다 이 값을
 * 탄다. 재발급 호출에도 같은 헤더 묶음이 넘어간다.
 *
 * 유입 경로와 마케팅 여섯 칸(KAN-577): 진입 주소의 `?path=`(없으면 `utm_source`)와 utm·클릭 식별자
 * 쿼리, 외부 Referer로 정한다(`readPathParam`, `resolveRequestMarketing`). 값을 정하는 건 전과 같고
 * 쿠키를 심는 자리만 바뀌었다(KAN-667).
 * - 페이지 요청: 주소로 정한 값을 이번 렌더의 헤더에만 싣고 쿠키는 심지 않는다. 광고처럼 밖에서
 *   들어온 첫 화면은 거의 다 심을 값이 있어서, 여기서 심고 안전핀으로 `no-store`를 걸면 광고 랜딩
 *   화면이 CDN도 bfcache도 못 탄다.
 * - `/be` fetch: 쿠키 값을 쓴다. 다만 랜딩 쿠키(`LANDING_COOKIE`)가 있으면 그것이 진입 주소의 쿼리와
 *   Referer라서, 페이지 요청이었던 것처럼 그 값으로 정해 이번 응답에 심고 랜딩 쿠키를 지운다. 첫 화면
 *   JS가 보내는 `app_entered`부터 유입이 붙는다.
 * 형식이 안 맞는 쿠키 값은 없는 것으로 본다. 경로 쿠키가 없으면 `direct`다.
 *
 * 진입 화면: `resolveRequestEntry`. 일회용 쿠키(읽으면 지운다), 요청 주소(공유 표식 포함), 소프트
 * 내비게이션의 Referer 순이다. 조회 기록처럼 클라이언트가 직접 실은 헤더는 그대로 살린다(`forward`).
 *
 * 인앱 브라우저(KAN-610): `proxy`가 UA로 정한 `resolveBrowserKind` 값을 그대로 싣는다. 쿠키가 없고
 * 요청마다 정하므로 여기서 저장할 것이 없다. 외부 브라우저도 `browser`로 늘 싣는다. BE가 "없음"과
 * "외부"를 가를 수 있어야 인앱과 외부의 체류·재방문을 비교한다.
 *
 * @param request 이번 요청
 * @param isProxy `/be` fetch인가
 * @param isCrawler 검색 크롤러인가(`CRAWLER_UA_PATTERN`)
 * @param browser UA로 가른 인앱 브라우저 종류(`resolveBrowserKind`)
 */
function resolveAnalytics(
  request: NextRequest,
  isProxy: boolean,
  isCrawler: boolean,
  browser: BrowserKind,
): Analytics {
  const cookies: Analytics["cookies"] = [];

  const deviceCookie = request.cookies.get(DEVICE_ID_COOKIE)?.value;
  const device = isDeviceId(deviceCookie) ? deviceCookie : null;

  const landing = isProxy
    ? parseLandingCookie(request.cookies.get(LANDING_COOKIE)?.value)
    : null;
  if (isProxy && request.cookies.has(LANDING_COOKIE)) {
    cookies.push({ name: LANDING_COOKIE, value: "", httpOnly: false });
  }
  /* 진입 주소의 값을 읽는 요청인가. 페이지 요청이거나, 랜딩 쿠키를 든 `/be` fetch다 */
  const entrySource =
    landing ??
    (isProxy
      ? null
      : {
          searchParams: request.nextUrl.searchParams,
          referer: request.headers.get("referer"),
        });
  /* 쿠키를 심는 건 `/be` 응답뿐이다. 페이지 응답은 CDN이 저장할 수 있다 (KAN-667) */
  const writesCookies = isProxy && !isCrawler;

  const stored = request.cookies.get(PATH_COOKIE)?.value;
  const param = entrySource ? readPathParam(entrySource.searchParams) : null;
  const storedPath = isPathValue(stored) ? stored : null;
  const path = param ?? storedPath ?? DIRECT_PATH;
  if (param && param !== stored) {
    if (writesCookies) {
      cookies.push({ name: PATH_COOKIE, value: param, httpOnly: true });
    }
    request.cookies.set(PATH_COOKIE, param);
  }

  const { marketing, cookie: marketingCookie } = resolveRequestMarketing({
    cookie: request.cookies.get(MARKETING_COOKIE)?.value,
    searchParams: entrySource?.searchParams ?? new URLSearchParams(),
    referer: entrySource?.referer ?? null,
    ownHost: request.nextUrl.hostname,
    isProxy: entrySource === null,
    isCrawler,
  });
  if (marketingCookie !== null) {
    if (writesCookies) {
      cookies.push({
        name: MARKETING_COOKIE,
        value: marketingCookie,
        httpOnly: true,
      });
    }
    if (marketingCookie) request.cookies.set(MARKETING_COOKIE, marketingCookie);
    else request.cookies.delete(MARKETING_COOKIE);
  }

  const { entry, consumed } = resolveRequestEntry({
    isProxy,
    isRsc: request.headers.has("rsc"),
    pathname: request.nextUrl.pathname,
    searchParams: request.nextUrl.searchParams,
    referer: request.headers.get("referer"),
    handed: request.cookies.get(ENTRY_COOKIE)?.value,
  });
  if (consumed)
    cookies.push({ name: ENTRY_COOKIE, value: "", httpOnly: false });

  const headers: Record<string, string> = {
    [ANALYTICS_HEADERS.path]: path,
    [ANALYTICS_HEADERS.client]: PLICK_CLIENT,
    [ANALYTICS_HEADERS.browser]: browser,
    ...marketingHeaders(marketing),
  };
  if (device) headers[ANALYTICS_HEADERS.device] = device;
  if (entry) headers[ANALYTICS_HEADERS.entry] = entry;
  if (
    isBotRequest({ isCrawler, hasE2eCookie: request.cookies.has(E2E_COOKIE) })
  ) {
    headers[ANALYTICS_HEADERS.bot] = BOT_HEADER_VALUE;
  }
  return { headers, cookies };
}

/**
 * 요청 헤더에 분석 헤더를 찍고(KAN-542), BE 프록시(`/be/*`)면 access 토큰까지
 * Bearer로 실어 통과시킨다. 프록시가 돌려주는 모든 `next()`가 이 함수를 거친다.
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
 *
 * 분석 헤더는 페이지 요청에도 찍는다. 그 헤더는 BE로 가는 게 아니라 이번 렌더의 서버
 * 컴포넌트가 `headers()`로 읽어 서버 측 `apiFetch`에 옮겨 싣는 용도다. 기기·경로·앱은
 * 브라우저가 보낸 값이 있어도 프록시 값으로 덮는다(프록시가 주인이다). 진입 화면만은
 * 클라이언트가 직접 실은 값을 살린다 - 경로로 못 정하는 `hot`·`share_link`가 그쪽 몫이라서다.
 *
 * 헤더 스냅샷은 호출 시점에 뜬다. 재발급이 `request.cookies.set`으로 바꾼
 * 쿠키를 다운스트림이 보려면 그 뒤에 불러야 한다.
 *
 * 라이브 스코어를 닫아 둔 동안(KAN-644) 그 화면 경로는 `next` 대신 준비중 화면으로 rewrite한다.
 * 페이지 갈래가 모두 여기를 지나므로 재발급은 그대로 돌고 화면만 바뀐다.
 *
 * 쿠키를 심어야 하는 `/be` 요청은 `next()`가 아니라 여기서 BE로 직접 rewrite한다 (KAN-667).
 * `next.config.js`의 rewrites가 외부 주소를 가리키면 Next가 미들웨어 응답 헤더를 버린다
 * (`resolve-routes.js`의 외부 rewrite 갈래가 `resHeaders: null`을 돌려준다). 요청 헤더(Bearer)는
 * 살지만 `Set-Cookie`는 브라우저에 닿지 않는다. 미들웨어가 직접 외부로 rewrite하면 응답 헤더를
 * 실은 채로 넘긴다. 목적지는 config와 같은 `${API_BASE_URL}/:path*`다. 쿠키가 없는 대부분의
 * `/be` 요청은 전처럼 config rewrites를 탄다.
 *
 * @param request 이번 요청. `request.cookies.set`이 끝난 뒤의 상태
 * @param analytics `resolveAnalytics`가 정한 값
 * @param accessToken `/be` 요청에 실을 토큰. 페이지 요청이면 생략
 * @param setsCookies 이 응답에 세션 쿠키를 심는가(재발급). 분석 쿠키는 `analytics`로 안다
 */
function forward(
  request: NextRequest,
  analytics: Analytics,
  accessToken?: string,
  setsCookies = false,
): NextResponse {
  const headers = new Headers(request.headers);
  for (const name of Object.values(ANALYTICS_HEADERS)) {
    const value = analytics.headers[name];
    if (name === ANALYTICS_HEADERS.entry && headers.has(name)) continue;
    if (value) headers.set(name, value);
    else headers.delete(name);
  }
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const { pathname, search } = request.nextUrl;
  if (
    pathname.startsWith(BE_PROXY_PREFIX) &&
    (setsCookies || analytics.cookies.length > 0)
  ) {
    const base = process.env.API_BASE_URL ?? "http://localhost:8080";
    return NextResponse.rewrite(
      new URL(`${base}${pathname.slice(BE_PROXY_PREFIX.length)}${search}`),
      { request: { headers } },
    );
  }
  if (LIVE_SCORE_PAUSED && isLiveScorePath(request.nextUrl.pathname)) {
    return NextResponse.rewrite(new URL(LIVE_PAUSED_PATH, request.url), {
      request: { headers },
    });
  }
  return NextResponse.next({ request: { headers } });
}

/**
 * 세션을 이루는 쿠키. 게스트 마감으로 세션을 끝낼 때 모두 지운다 (KAN-667). 세션 종류 표식까지 지워야
 * 브라우저(`AuthProvider`)가 세션 없음으로 보고 새 게스트를 받아 간다.
 */
const SESSION_COOKIES = [
  AUTH_COOKIES.access,
  AUTH_COOKIES.refresh,
  GUEST_EXPIRES_COOKIE,
  SESSION_KIND_COOKIE,
  GUEST_FROM_LOGOUT_COOKIE,
  REFRESH_RETRY_COOKIE,
];

export async function proxy(request: NextRequest) {
  const isProxy = request.nextUrl.pathname.startsWith(BE_PROXY_PREFIX);
  const userAgent = request.headers.get("user-agent") ?? "";
  const isCrawler = CRAWLER_UA_PATTERN.test(userAgent);
  const browser = resolveBrowserKind(userAgent);
  /**
   * 크롤러의 분석 쓰기(행동 이벤트, 조회 기록)는 BE까지 보내지 않는다 (KAN-584). 구글봇·애플봇처럼
   * JS를 돌리는 크롤러가 기사 화면에서 둘 다 보내는데, 조회 기록은 비로그인 허용이라
   * `article_opened`가 기기 없이 남아 열람을 부풀린다(prod ALB 로그 하루치에서 구글봇 조회 기록이
   * 사람 모바일 브라우저 전체와 맞먹었다). 그 둘만 끊는다. 크롤러 판정이 사람을 잘못 잡아도
   * 좋아요·댓글은 그대로 가고 분석값만 빠진다. 읽기는 전처럼 익명으로 통과시킨다.
   */
  if (
    isProxy &&
    isCrawler &&
    isAnalyticsWrite(
      request.method,
      request.nextUrl.pathname.slice(BE_PROXY_PREFIX.length),
    )
  ) {
    return new NextResponse(null, { status: 204 });
  }
  const analytics = resolveAnalytics(request, isProxy, isCrawler, browser);
  const response = await route(request, isProxy, isCrawler, analytics);
  /**
   * 분석 쿠키는 어느 갈래로 끝났든 이번 응답에 싣는다 (KAN-542). 리다이렉트 응답에
   * 심어도 브라우저가 저장하므로 재시도 갈래에서도 새 기기가 생기지 않는다.
   */
  for (const cookie of analytics.cookies) {
    if (!cookie.value) {
      response.cookies.delete(cookie.name);
      continue;
    }
    response.cookies.set(cookie.name, cookie.value, {
      ...AUTH_COOKIE_BASE,
      httpOnly: cookie.httpOnly,
      maxAge: ANALYTICS_COOKIE_MAX_AGE,
    });
  }
  /**
   * 안전핀 (KAN-667). 어느 갈래로든 쿠키를 심거나 지운 응답은 이 사람 것이다. 정적·ISR 문서여도
   * CDN과 브라우저가 저장하지 못하게 덮는다. 평범한 페이지 응답은 쿠키가 없어 여기 걸리지 않고,
   * 걸리는 건 토큰 재발급(55분에 한 번), 진입 화면 일회용 쿠키 소모, 게스트 마감처럼 드문 요청이다.
   * 앞으로 누가 페이지 응답에 쿠키를 더해도 그 응답이 남에게 나가지 않는다.
   */
  if (response.cookies.getAll().length > 0) {
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
}

/**
 * 세션 갈래를 고른다. 분석 값은 `proxy`가 앞에서 정해 넘기고, 여기서 돌려주는 응답에
 * 쿠키를 얹는 것도 `proxy`가 한다 - 갈래가 많아 갈래마다 심으면 빠뜨린다.
 */
async function route(
  request: NextRequest,
  isProxy: boolean,
  isCrawler: boolean,
  analytics: Analytics,
): Promise<NextResponse> {
  const accessToken = request.cookies.get(AUTH_COOKIES.access)?.value;
  const refreshToken = request.cookies.get(AUTH_COOKIES.refresh)?.value;

  /* access가 살아있음 → 아직 미만료. 프록시 요청이면 토큰까지 실어 통과시킨다 */
  if (accessToken) {
    return forward(request, analytics, isProxy ? accessToken : undefined);
  }

  /**
   * 토큰이 하나도 없는 첫 진입은 익명으로 통과시킨다 (KAN-667).
   *
   * KAN-514부터는 여기서 게스트를 발급해 이 페이지 응답에 토큰을 심었다. 지금은 브라우저가
   * 화면을 띄운 뒤 `POST /api/session/guest`로 받아 간다. 이 응답에 토큰이 없어야 CDN이 정적·ISR
   * 문서를 저장해 다음 사람에게 줄 수 있다. 첫 화면은 원래 익명 ISR이라 렌더 결과도 같다.
   */
  if (!refreshToken) {
    return forward(request, analytics);
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
    return forward(request, analytics);
  }

  try {
    /**
     * 재발급은 같은 토큰끼리 한 번으로 묶는다 (KAN-379). access 쿠키가 만료된
     * 직후에는 요청 여러 개가 동시에 여기 닿는데, BE 재발급이 회전 방식이라
     * 각자 부르면 하나만 성공하고 나머지는 401 → 아래 catch가 멀쩡한 세션을
     * 끊어 버린다.
     */
    const tokens = await refreshTokensShared(refreshToken, analytics.headers);

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
    const response = forward(
      request,
      analytics,
      isProxy ? tokens.accessToken : undefined,
      true,
    );
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
        ...SESSION_COOKIE_BASE,
        maxAge: REFRESH_TOKEN_MAX_AGE,
      });
    } else {
      response.cookies.delete(GUEST_EXPIRES_COOKIE);
    }
    /* 세션 종류 표식도 같이 갱신한다 (KAN-667). 연동 직후처럼 게스트에서 소셜로 바뀐 경우를 따라간다 */
    response.cookies.set(
      SESSION_KIND_COOKIE,
      tokens.guestExpiresAt ? SESSION_KIND.guest : SESSION_KIND.user,
      { ...SESSION_COOKIE_BASE, maxAge: REFRESH_TOKEN_MAX_AGE },
    );
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
      return forward(request, analytics);
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
     *
     * 새 게스트는 KAN-667부터 여기서 발급하지 않는다. 죽은 쿠키를 지워 첫 방문과 같은 상태로
     * 만들면 브라우저가 화면을 띄운 뒤 받아 간다. 이 응답은 쿠키를 지우므로 안전핀이 `no-store`로 덮는다.
     */
    if (request.cookies.has(GUEST_EXPIRES_COOKIE)) {
      for (const name of SESSION_COOKIES) request.cookies.delete(name);
      const response = forward(request, analytics);
      for (const name of SESSION_COOKIES) response.cookies.delete(name);
      return response;
    }
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(AUTH_COOKIES.access);
    response.cookies.delete(AUTH_COOKIES.refresh);
    response.cookies.delete(SESSION_KIND_COOKIE);
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

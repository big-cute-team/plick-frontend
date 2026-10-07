/**
 * @file 분석 헤더 계약 (KAN-542, BE KAN-538). 메인 API로 가는 모든 요청에 싣는 헤더와,
 * 그 값을 보관하는 쿠키 이름·수명·형식 규칙을 한곳에 둔다.
 *
 * 두 앱(mobile·web)의 `proxy.ts`가 같은 쿠키를 읽고 같은 헤더를 만들며, 도메인을 넘길 때
 * 한쪽이 심은 값을 다른 쪽이 받아야 하므로 처음부터 공용에 둔다(ADR 0011 게이트 C).
 * 값을 정하는 쪽이 여기고, 헤더를 실제로 붙이는 자리는 각 앱 프록시(브라우저 `/be` fetch)와
 * `client.ts`의 헤더 제공자(서버 측 fetch) 둘이다.
 *
 * 서버는 헤더가 없거나 값이 이상해도 요청을 거절하지 않는다. 모르는 값은 `unknown`으로 접고
 * UUID 형식이 아닌 기기 식별자는 비운다(BE `RequestOrigin`). 그래서 여기서는 형식만 맞추고
 * 허용 목록은 두지 않는다 - 유입 경로 값이 늘 때 BE 목록만 고치면 되게 한다.
 */

/** 분석 헤더 이름. BE `RequestOrigin`의 상수와 같다. */
export const ANALYTICS_HEADERS = {
  /** 기기 식별자 UUID. 방문자 수(unique)의 기준 */
  device: "X-Plick-Device",
  /** 유입 경로 (`insta`, `facebook`, `ad`, `ad_tv`, `share`, `direct`) */
  path: "X-Plick-Path",
  /** 앱 구분 (`mobile_web`, `desktop_web`). 앱마다 고정값 */
  client: "X-Plick-Client",
  /** 기사를 연 쪽 화면 (`EntryPoint`). 프록시가 주소·Referer·일회용 쿠키로 정하고 조회 기록은 브라우저가 직접 싣는다 */
  entry: "X-Plick-Entry",
  /** 광고 캠페인 (`?utm_campaign=`, KAN-577). 이하 여섯 개는 `marketing.ts`가 값을 정한다 */
  utmCampaign: "X-Plick-Utm-Campaign",
  /** 광고 매체 유형 (`?utm_medium=`) */
  utmMedium: "X-Plick-Utm-Medium",
  /** 광고 소재 (`?utm_content=`) */
  utmContent: "X-Plick-Utm-Content",
  /** 외부 유입 도메인. 전체 URL이 아니라 호스트만 싣는다 */
  referrer: "X-Plick-Referrer",
  /** 광고 클릭 식별자 원값 (`fbclid`·`gclid`·`ttclid`). 대소문자를 보존한다 */
  clickId: "X-Plick-Click-Id",
  /** 클릭 식별자가 어느 플랫폼 것인지 (`meta`, `google`, `tiktok`) */
  clickSource: "X-Plick-Click-Source",
  /** 봇 표시 (KAN-607, BE KAN-606). 값이 `1`이면 BE가 이벤트를 `is_bot = true`로 남긴다. 프록시가 정한다 */
  bot: "X-Plick-Bot",
  /** 인앱 브라우저 종류 (KAN-610, BE KAN-609). `BROWSER_KINDS` 중 하나. 프록시가 UA로 정한다 */
  browser: "X-Plick-Browser",
} as const;

/** `X-Plick-Bot`에 싣는 유일한 값. BE는 `1`만 봇으로 읽고 나머지는 전부 사람으로 접는다. */
export const BOT_HEADER_VALUE = "1";

/**
 * E2E가 dev WAF를 지나려고 싣는 쿠키 (KAN-573). 이름이 보이면 봇으로 표시한다 (KAN-607).
 *
 * 값은 안 본다. 위조해 봐야 보낸 사람 자기 이벤트가 판단 수치에서 빠질 뿐이고, 그걸 막으려고
 * WAF 토큰을 프록시에 풀어 둘 이유가 없다. 이름은 `tests/e2e/playwright.config.ts`와 같다.
 */
export const E2E_COOKIE = "plick_e2e";

/**
 * 봇으로 표시할 요청인지 (KAN-607). 두 앱 프록시가 같이 쓴다.
 *
 * 크롤러(`CRAWLER_UA_PATTERN`)와 E2E(`E2E_COOKIE`)다. 둘 다 사람 기기처럼 보이는 이벤트를 남기는데,
 * E2E는 갤럭시·데스크톱 크롬 UA를 쓰고 테스트마다 새 브라우저라 UA로도 쿠키로도 사람과 안 갈린다.
 * dev 기기 187대 중 180대가 E2E였다. 크롤러는 게스트를 안 받아도 서버 렌더링이 피드를 불러
 * `feed_served`가 사람으로 남아 조회율을 10배 넘게 낮춰 보이게 했다.
 *
 * @param input 프록시가 요청에서 뽑은 판정 재료
 */
export function isBotRequest(input: {
  /** 검색 크롤러인가(`CRAWLER_UA_PATTERN`) */
  isCrawler: boolean;
  /** `E2E_COOKIE`가 요청에 있는가 */
  hasE2eCookie: boolean;
}): boolean {
  return input.isCrawler || input.hasE2eCookie;
}

/**
 * `X-Plick-Browser` 값 (KAN-610, BE KAN-609). 인앱 브라우저 다섯 종과 우리 앱 셸, 그 밖의 인앱, 외부
 * 브라우저다. BE는 `X-Plick-Path`처럼 형식(`[a-z0-9_]{1,32}`)만 보고 원값을 남기므로 여기 목록이
 * 곧 값의 출처다.
 *
 * `plick_app`은 티켓 목록에 없던 값이다. 우리 네이티브 앱 셸(RN WebView)은 UA 끝에 `PlickApp/x.y`를
 * 붙이는데, 그걸 안 가르면 웹뷰라서 `other_inapp`으로 접혀 우리 앱 사용자가 남의 인앱과 섞인다.
 */
export const BROWSER_KINDS = [
  "instagram",
  "facebook",
  "kakaotalk",
  "naver",
  "line",
  "plick_app",
  "other_inapp",
  "browser",
] as const;

/** `X-Plick-Browser`에 실을 수 있는 값. */
export type BrowserKind = (typeof BROWSER_KINDS)[number];

/**
 * UA에서 인앱 종류를 알아보는 규칙. 앞선 것이 이긴다.
 *
 * 인스타그램 인앱 UA는 `Instagram 3xx.x.x.x.xxx Android (...)`처럼 이름이 그대로 들어 있고,
 * 페이스북은 `FBAN/FB4A` `FBAV/4xx` 꼴이다. 카카오톡은 `KAKAOTALK 10.x`, 네이버는 `NAVER(inapp; search; ...)`,
 * 라인은 `Line/14.x`다. 인스타 UA에 `FBAN`이 같이 붙는 빌드가 있어 인스타를 먼저 본다.
 * 우리 앱 셸은 `PlickApp/x.y`를 UA 끝에 단다(plick-AppShell `USER_AGENT_SUFFIX`).
 */
const BROWSER_KIND_RULES: readonly (readonly [BrowserKind, RegExp])[] = [
  ["plick_app", /\bPlickApp(\/|\b)/],
  ["instagram", /\bInstagram\b/i],
  ["facebook", /\bFB(AN|AV|_IAB)\b/],
  ["kakaotalk", /\bKAKAOTALK\b/i],
  ["naver", /NAVER\(inapp/i],
  ["line", /\bLine\//],
];

/**
 * 이름 없는 인앱 웹뷰 표식. 안드로이드 WebView는 UA에 `; wv)`를 단다(크롬 정책). iOS WKWebView는
 * 사파리와 달리 `Safari/` 토큰이 없다. 크롬·파이어폭스 iOS는 `CriOS`·`FxiOS`지만 `Safari/`도 같이
 * 있어 여기 안 걸린다.
 */
const ANDROID_WEBVIEW_PATTERN = /;\s*wv\)/;
const IOS_PATTERN = /\b(iPhone|iPad|iPod)\b/;

/**
 * UA로 인앱 브라우저 종류를 정한다 (KAN-610). 두 앱 프록시가 같이 쓰고, 모바일 배너는 브라우저에서
 * `navigator.userAgent`로 같은 함수를 부른다. 한 함수를 양쪽이 쓰니 "헤더는 인스타인데 배너는
 * 안 뜨는" 어긋남이 없다.
 *
 * 크롤러는 따로 안 가른다. 봇 표시는 `X-Plick-Bot`(KAN-607)이 맡고, 크롤러 UA는 대개 `browser`로
 * 떨어진다. 모르는 값은 `other_inapp`이 아니라 `browser`다. 인앱이라는 적극적 표식이 있을 때만
 * 인앱으로 센다.
 *
 * @param userAgent 요청의 User-Agent. 없으면 빈 문자열
 */
export function resolveBrowserKind(userAgent: string): BrowserKind {
  for (const [kind, pattern] of BROWSER_KIND_RULES) {
    if (pattern.test(userAgent)) return kind;
  }
  if (ANDROID_WEBVIEW_PATTERN.test(userAgent)) return "other_inapp";
  if (
    IOS_PATTERN.test(userAgent) &&
    /AppleWebKit/.test(userAgent) &&
    !/Safari\//.test(userAgent)
  ) {
    return "other_inapp";
  }
  return "browser";
}

/**
 * 외부 브라우저로 열기를 권할 인앱 종류 (KAN-610). 광고 유입이 오는 인스타·페이스북부터다. 카카오톡과
 * 네이버는 쿠키를 지우는지 아직 모르고, 우리 앱 셸은 인앱이어도 우리 것이다.
 */
export const EXTERNAL_BROWSER_SUGGEST_KINDS: readonly BrowserKind[] = [
  "instagram",
  "facebook",
];

/** 서버 측 fetch가 요청 헤더에서 그대로 옮겨 실을 헤더 이름 목록. */
export const ANALYTICS_HEADER_NAMES: readonly string[] =
  Object.values(ANALYTICS_HEADERS);

/** `X-Plick-Client` 값. 앱마다 하나를 고정으로 보낸다. */
export type PlickClient = "mobile_web" | "desktop_web";

/**
 * 기기 식별자를 들고 있는 쿠키 (KAN-542). 프록시가 없으면 UUID를 만들어 심는다.
 *
 * HttpOnly가 아니다. PC·모바일 전환 배너가 링크에 이 값을 쿼리로 실어야 하는데
 * (`@plick/domain/cross-site`), 배너는 브라우저에서 도는 클라 컴포넌트라 읽을 수 있어야
 * 한다. 담긴 값은 익명 난수 하나라 노출돼도 잃을 게 없고, 브라우저에서 고쳐 봐야 서버가
 * UUID 형식이 아니면 비운다.
 */
export const DEVICE_ID_COOKIE = "plick_did";

/**
 * 기기 식별자를 같이 두는 localStorage 키 (KAN-610). 인앱 브라우저(인스타·페이스북)는 쿠키를
 * 날을 넘겨 안 들고 다녀 같은 사람이 매번 새 기기가 됐다(prod 10/02~10/07, 인스타 유입 기기 중
 * 이틀 이상 온 비율 4.7%). 쿠키와 함께 여기에도 적어 두고, 쿠키가 사라졌으면 `deviceSyncScript`가
 * 여기 값으로 쿠키를 되살린다.
 */
export const DEVICE_ID_STORAGE_KEY = "plick_did";

/**
 * 이번 탭에서 기기 식별자를 localStorage에서 되살렸다는 표식(sessionStorage). `deviceSyncScript`가
 * 심고 `touchSession`이 한 번 읽고 지워 `app_entered`에 `device_restored: true`를 싣는다. 인앱이
 * 쿠키와 localStorage를 같이 지우면 복원은 일어나지 않으니, 이 수치가 복원을 유지할지의 근거다.
 */
export const DEVICE_RESTORED_KEY = "plick_did_restored";

/**
 * `<head>`에 동기로 박는 기기 식별자 동기화 스크립트 (KAN-610). 두 앱 루트 레이아웃이 같은 문자열을
 * 쓴다. 쿠키 이름·수명·형식을 이 파일의 상수에서 조립하므로 프록시와 어긋나지 않는다.
 *
 * 하는 일은 둘이다. localStorage에 유효한 값이 있는데 쿠키가 그 값이 아니면 쿠키를 그 값으로 다시
 * 심고 복원 표식을 남긴다. localStorage가 비었고 쿠키가 유효하면 localStorage에 적는다.
 *
 * 왜 서버가 아니라 브라우저가 심나: 프록시는 쿠키 없는 페이지 요청에서 JS가 돌기 전에 이미 새 UUID를
 * 심는다(`resolveDeviceId`). 그래서 JS가 보는 시점엔 쿠키가 "없는" 게 아니라 "방금 생긴" 상태고,
 * 다음 요청의 프록시는 그게 방금 만든 값인지 원래 값인지 가를 수 없다. 쿠키는 어차피 HttpOnly가
 * 아니고 서버가 심든 JS가 심든 같은 저장소라 보존이 다르지 않다. 방금 만든 값은 헤더로 나간 적이
 * 없어(KAN-607, 쿠키에서 온 값만 싣는다) 덮어써도 BE에 흔적이 없다.
 *
 * 왜 `<head>` 동기인가: 하이드레이션 뒤 이펙트에서 하면 그보다 먼저 나간 `/be` fetch(릴스 조회 등)가
 * 새 값을 `X-Plick-Device`로 싣고 간다. 첫 바이트 전에 돌아야 이번 페이지의 모든 요청이 옛 값을 단다.
 * DOM은 안 건드리니 하이드레이션 경고와 무관하다.
 *
 * 쿠키 속성은 프록시(`AUTH_COOKIE_BASE` + `ANALYTICS_COOKIE_MAX_AGE`)와 같다. `Secure`는 프록시가
 * `NODE_ENV`로 정하는데 브라우저는 그걸 모르니 프로토콜로 본다. 결과는 같다(로컬 http만 빠진다).
 *
 * 되살릴 때마다 수명이 400일로 다시 시작하므로 localStorage가 사는 한 식별자는 사실상 만료되지 않는다.
 * 의도한 것이다. 400일은 "1년 이상 길게"라는 요구에 크롬의 `Max-Age` 상한을 그대로 쓴 값이지 만료
 * 정책이 아니고, 식별자는 익명 난수 하나라 오래 살아도 잃을 것이 없다. 사용자가 사이트 데이터를 지우면
 * 둘 다 같이 사라진다.
 */
export function deviceSyncScript(): string {
  const cookie = DEVICE_ID_COOKIE;
  const pattern = DEVICE_ID_PATTERN.source;
  const attrs = `; Max-Age=${ANALYTICS_COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
  return (
    "(function(){try{" +
    `var m=document.cookie.match(/(?:^|; )${cookie}=([^;]*)/);` +
    "var c=m?m[1]:null;" +
    `var l=localStorage.getItem("${DEVICE_ID_STORAGE_KEY}");` +
    `var re=/${pattern}/i;` +
    'if(re.test(l||"")){' +
    "if(c!==l){" +
    `document.cookie="${cookie}="+l+"${attrs}"+(location.protocol==="https:"?"; Secure":"");` +
    `sessionStorage.setItem("${DEVICE_RESTORED_KEY}","1")` +
    "}" +
    `}else if(re.test(c||"")){localStorage.setItem("${DEVICE_ID_STORAGE_KEY}",c)}` +
    "}catch(e){}})()"
  );
}

/**
 * 유입 경로를 들고 있는 쿠키 (KAN-542). 첫 진입 URL의 `?path=`, 없으면 `utm_source`, 둘 다
 * 없으면 `direct`. 새 파라미터가 오면 갱신하고, 없으면 기존 값을 유지한다. 읽는 쪽이 프록시뿐이라 HttpOnly다.
 */
export const PATH_COOKIE = "plick_path";

/** 유입 경로 파라미터가 하나도 없을 때 보내는 값. */
export const DIRECT_PATH = "direct";

/** 유입 경로를 읽는 쿼리 파라미터. 앞이 우선이고, 광고 매체가 붙이는 `utm_source`는 폴백이다. */
export const PATH_QUERY_PARAMS = ["path", "utm_source"] as const;

/**
 * 기기·유입 경로 쿠키 수명(초). "1년 이상 길게"가 요구사항이고, 크롬이 `Max-Age`를
 * 400일로 자르므로 그 상한을 그대로 쓴다. 더 길게 적어도 400일로 깎인다.
 */
export const ANALYTICS_COOKIE_MAX_AGE = 60 * 60 * 24 * 400;

/**
 * BE가 받아 주는 기기 식별자 형식 (`RequestOrigin.DEVICE_ID_PATTERN`). 이 형식이 아니면
 * BE가 비우므로, 쿠키·쿼리에서 읽은 값도 같은 기준으로 걸러 새로 만든다.
 */
const DEVICE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 유입 경로 값의 형식. 허용 목록은 BE가 들고 있으니 여기서는 헤더에 실어도 안전한
 * 문자만 남긴다(소문자·숫자·밑줄 32자 이하).
 */
const PATH_VALUE_PATTERN = /^[a-z0-9_]{1,32}$/;

/**
 * 기기 식별자로 쓸 수 있는 값인지.
 *
 * @param value 쿠키나 쿼리에서 읽은 값
 */
export function isDeviceId(value: string | null | undefined): value is string {
  return !!value && DEVICE_ID_PATTERN.test(value);
}

/** `resolveDeviceId`가 요청에서 읽는 것. 프록시가 `NextRequest`에서 뽑아 넘긴다. */
export interface DeviceIdInput {
  /** 기기 쿠키(`DEVICE_ID_COOKIE`) 값. 없으면 undefined */
  cookie: string | null | undefined;
  /** 전환 배너가 쿼리(`?did=`)로 넘긴 값. 없으면 null */
  handed: string | null;
  /** `/be` fetch인가 */
  isProxy: boolean;
  /** 검색 크롤러인가(`CRAWLER_UA_PATTERN`) */
  isCrawler: boolean;
}

/** `resolveDeviceId`의 결과. */
export interface DeviceIdResult {
  /** 이번 요청의 기기 식별자. 크롤러나 쿠키 없는 `/be` fetch면 null */
  id: string | null;
  /** `X-Plick-Device`에 실을지. 쿠키를 들고 온 요청만 true다 */
  send: boolean;
  /** 이번 응답에 쿠키를 심을지. 새로 만들었거나 배너에서 넘겨받았을 때 true다 */
  issue: boolean;
}

/**
 * 요청 하나의 기기 식별자를 정하고, 헤더에 실을지와 쿠키를 심을지를 가른다 (KAN-542, KAN-607).
 * 두 앱 프록시가 같이 쓴다.
 *
 * 값은 셋 중 하나다. 쿠키가 있으면 그것. 없으면 전환 배너가 쿼리로 넘긴 값. 그것도 없으면 새
 * UUID다. 쿼리 채택은 쿠키가 없을 때만이다. 있는 사람의 식별자를 남이 보낸 링크가 덮어쓰면 안
 * 된다. 만드는 건 페이지 요청에서만 한다. `/be` fetch는 항상 페이지 뒤에 오므로 그때는 이미
 * 쿠키가 있고, 없는 채로 여러 fetch가 동시에 오면 각자 다른 값을 만들어 마지막 Set-Cookie만
 * 남는 꼴이 된다. 크롤러에게는 만들지 않는다. 쿠키를 안 들고 다녀 요청마다 새 기기가 된다.
 *
 * 헤더에는 쿠키에서 온 값만 싣는다 (KAN-607). UA를 사람처럼 위장한 크롤러는 패턴으로 못 거르고
 * 쿠키도 안 들고 다녀서, 첫 요청에 바로 실으면 페이지 하나마다 새 기기가 BE에 남는다(prod 기기
 * 절반이 이랬다. 한 IP가 1분에 페이지 162개를 긁어 기기 146대를 만들었다). 새 값은 쿠키에만 심고,
 * 브라우저가 그 쿠키를 들고 다시 올 때부터 싣는다. 사람은 첫 화면 JS가 보내는 `app_entered`부터
 * 쿠키가 있으니 거기서부터 기기가 붙고, 첫 서버 렌더링 이벤트 하나만 기기 없이 남는다. 쿠키를
 * 버리는 크롤러는 영원히 첫 요청이라 기기를 한 번도 못 받는다. 배너가 넘긴 값도 같은 규칙이다.
 * 다음 요청부터 같은 기기로 이어지므로 첫 페이지 한 번만 빈다.
 *
 * @param input 요청에서 뽑은 값
 * @param generate 새 식별자를 만드는 함수. 테스트가 바꿔 끼운다
 */
export function resolveDeviceId(
  input: DeviceIdInput,
  generate: () => string = () => crypto.randomUUID(),
): DeviceIdResult {
  if (isDeviceId(input.cookie)) {
    return { id: input.cookie, send: true, issue: false };
  }
  if (input.isProxy) return { id: null, send: false, issue: false };
  if (isDeviceId(input.handed)) {
    return { id: input.handed.toLowerCase(), send: false, issue: true };
  }
  if (input.isCrawler) return { id: null, send: false, issue: false };
  return { id: generate(), send: false, issue: true };
}

/**
 * 유입 경로로 헤더에 실어도 되는 값인지. 쿠키는 브라우저에서 고칠 수 있어 읽을 때도 거른다.
 *
 * @param value 쿠키에서 읽은 값
 */
export function isPathValue(value: string | null | undefined): value is string {
  return !!value && PATH_VALUE_PATTERN.test(value);
}

/**
 * 쿼리에서 유입 경로를 읽는다. `path`가 있으면 그것, 없으면 `utm_source`, 둘 다 없으면 null.
 * 형식에 안 맞는 값(대문자·공백·긴 값)은 소문자로 접은 뒤에도 안 맞으면 없는 것으로 본다.
 *
 * @param searchParams 진입 URL의 쿼리
 * @returns 쿠키에 심을 값. 없으면 null
 */
export function readPathParam(searchParams: URLSearchParams): string | null {
  for (const key of PATH_QUERY_PARAMS) {
    const raw = searchParams.get(key)?.trim().toLowerCase();
    if (isPathValue(raw)) return raw;
  }
  return null;
}

/** 공유 버튼이 만든 링크의 유입 경로 값 (KAN-578). */
export const SHARE_PATH = "share";

/**
 * 공유할 주소에 유입 경로 `?path=share`를 붙인다 (KAN-578). 링크를 타고 들어온 사람의
 * 프록시가 이 값을 `plick_path`에 심는다. Referer는 인앱 브라우저에서 대체로 비어서, 우리가
 * 만드는 링크에 직접 박는 것만 확실하다.
 *
 * 기존 쿼리는 두고 합친다. 프록시가 읽을 유입 경로(`path`, 없으면 `utm_source`)가 이미 있으면
 * 그대로 돌려준다. 덮으면 캠페인 링크를 공유했을 때 원래 유입이 지워진다. 빈 값이나 형식 밖이라
 * 프록시가 버릴 `path`는 없는 것과 같아 `share`로 갈아 끼운다(`set`이라 `path`가 둘이 되지 않는다).
 *
 * @param url 공유할 절대 주소. `location.origin`으로 조립하므로 파싱에 실패하지 않는다
 */
export function withSharePath(url: string): string {
  const parsed = new URL(url);
  if (readPathParam(parsed.searchParams) !== null) return url;
  parsed.searchParams.set("path", SHARE_PATH);
  return parsed.toString();
}

/** `X-Plick-Entry` 값 (KAN-542, KAN-584). 기사를 여는 쪽 화면 다섯 개다. */
export const ENTRY_POINTS = [
  "home_feed",
  "reels",
  "reels_deeplink",
  "hot",
  "share_link",
] as const;

/** `X-Plick-Entry`에 실을 수 있는 값. */
export type EntryPoint = (typeof ENTRY_POINTS)[number];

/**
 * 진입 화면 값인지. 브라우저가 심은 쿠키와 헤더는 고칠 수 있어 읽을 때 거른다.
 *
 * @param value 쿠키나 헤더에서 읽은 값
 */
export function isEntryPoint(
  value: string | null | undefined,
): value is EntryPoint {
  return (ENTRY_POINTS as readonly string[]).includes(value ?? "");
}

/**
 * 기사 링크를 누른 화면을 다음 페이지 요청까지 들고 가는 일회용 쿠키 (KAN-584).
 *
 * 핫이슈(`hot`)는 홈 안의 구획이라 경로로도 Referer로도 알 수 없다. 링크를 누르는 순간
 * 브라우저가 이 쿠키를 심고(`rememberArticleOrigin`), 뒤따르는 페이지 요청의 프록시가 읽어
 * `X-Plick-Entry`로 옮긴 뒤 지운다. 서버 렌더의 상세 호출까지 이 값이 닿는 길은 쿠키뿐이다 -
 * 라우터의 RSC 요청에는 헤더를 못 싣는다. 브라우저 JS가 쓰므로 HttpOnly가 아니다.
 */
export const ENTRY_COOKIE = "plick_entry";

/** 일회용 진입 쿠키 수명(초). 클릭에서 페이지 요청까지의 여유다. 못 읽혀도 스스로 사라진다. */
export const ENTRY_COOKIE_MAX_AGE = 30;

/**
 * 주소에서 진입 화면(`X-Plick-Entry`)을 고른다. 공유 링크 표식(`?path=share`, KAN-578)이 있으면
 * `share_link`, 홈은 `home_feed`, 릴스 피드는 `reels`, 릴 하나를 바로 여는 딥링크(`/reels/{id}`)는
 * `reels_deeplink`. `hot`은 주소로는 알 수 없어 링크를 누른 쪽이 쿠키로 넘긴다(`ENTRY_COOKIE`).
 *
 * 공유 표식이 경로보다 앞선다. 공유 받은 릴 링크는 릴스 딥링크이기도 하지만, 그 사람을 데려온 건
 * 공유다.
 *
 * @param pathname 페이지 요청이면 그 경로, `/be` fetch면 Referer의 경로
 * @param searchParams 같은 주소의 쿼리. 없으면 공유 표식을 안 본다
 * @returns 진입 화면 값. 모르면 null(헤더를 안 싣고 BE가 `unknown`으로 접는다)
 */
export function resolveEntryPoint(
  pathname: string,
  searchParams?: URLSearchParams,
): EntryPoint | null {
  if (searchParams && readPathParam(searchParams) === SHARE_PATH) {
    return "share_link";
  }
  if (pathname === "/") return "home_feed";
  if (pathname === "/reels") return "reels";
  if (/^\/reels\/[^/]+$/.test(pathname)) return "reels_deeplink";
  return null;
}

/**
 * 브라우저가 지금 보고 있는 주소의 진입 화면. 기사 화면이 조회 기록을 보낼 때 목록이 넘긴 값이
 * 없으면(공유 링크로 바로 열었을 때) 이걸 쓴다. 서버에서는 null.
 */
export function currentEntryPoint(): EntryPoint | null {
  if (typeof window === "undefined") return null;
  return resolveEntryPoint(
    window.location.pathname,
    new URLSearchParams(window.location.search),
  );
}

/**
 * 일회용 진입 쿠키를 심는다 (KAN-584). 브라우저에서만 의미가 있고 서버에서는 아무것도 안 한다.
 *
 * @param entry 기사 링크를 누른 화면
 */
export function handEntryPoint(entry: EntryPoint): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${ENTRY_COOKIE}=${entry}; Max-Age=${ENTRY_COOKIE_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
}

/** `resolveRequestEntry`가 요청에서 읽는 것. 프록시가 `NextRequest`에서 뽑아 넘긴다. */
export interface RequestEntryInput {
  /** `/be` fetch인가 */
  isProxy: boolean;
  /** 라우터의 소프트 내비게이션(`RSC` 헤더가 있는 페이지 요청)인가 */
  isRsc: boolean;
  /** 요청 경로 */
  pathname: string;
  /** 요청 쿼리 */
  searchParams: URLSearchParams;
  /** Referer 헤더 원문. 없으면 null */
  referer: string | null;
  /** 일회용 진입 쿠키(`ENTRY_COOKIE`) 값. 없으면 undefined */
  handed: string | null | undefined;
}

/** `resolveRequestEntry`의 결과. */
export interface RequestEntry {
  /** `X-Plick-Entry`에 실을 값. 모르면 null */
  entry: EntryPoint | null;
  /** 일회용 쿠키를 읽었으니 이번 응답에서 지워야 하는가 */
  consumed: boolean;
}

/**
 * 요청 하나의 진입 화면(`X-Plick-Entry`)을 고른다 (KAN-542, KAN-584). 두 앱 프록시가 같이 쓴다.
 * 앞선 것이 이긴다.
 *
 * 1. 기사 링크를 누른 쪽이 심은 일회용 쿠키(`ENTRY_COOKIE`, `rememberArticleOrigin`). 핫이슈처럼
 *    주소로는 모르는 값이 이 길로 오고, 페이지 요청이 읽으면 지운다(`consumed`). 30초 수명이지만
 *    그 사이 다른 페이지 요청에 묻으면 안 된다. `/be` fetch는 안 읽는다. 조회 기록은 브라우저가
 *    헤더로 직접 싣고 나머지 fetch는 Referer면 충분하다.
 * 2. 요청 주소. 페이지 요청은 그 경로와 쿼리(`?path=share`면 `share_link`), `/be` fetch는 Referer.
 * 3. 소프트 내비게이션(RSC 요청)이면 떠나온 화면(Referer). 홈에서 기사를 열면 기사 경로로는
 *    값이 없지만 Referer `/`가 `home_feed`다. 전체 로드로 바로 연 기사는 값이 없다.
 *
 * @param input 요청에서 뽑은 값
 */
export function resolveRequestEntry(input: RequestEntryInput): RequestEntry {
  let fromReferer: EntryPoint | null = null;
  if (input.referer) {
    try {
      const url = new URL(input.referer);
      fromReferer = resolveEntryPoint(url.pathname, url.searchParams);
    } catch {
      fromReferer = null;
    }
  }
  if (input.isProxy) return { entry: fromReferer, consumed: false };

  if (isEntryPoint(input.handed)) {
    return { entry: input.handed, consumed: true };
  }
  const own = resolveEntryPoint(input.pathname, input.searchParams);
  if (own) return { entry: own, consumed: false };
  return { entry: input.isRsc ? fromReferer : null, consumed: false };
}

/**
 * 크롤러가 보내도 BE까지 가면 안 되는 분석 쓰기 요청인지 (KAN-584). 행동 이벤트
 * (`POST /api/v1/events`)와 조회 기록(`POST /api/v1/articles/{id}/view`) 둘이다.
 *
 * 구글봇·애플봇처럼 JS를 돌리는 크롤러는 기사 화면에서 이 둘을 보낸다. 이벤트는 토큰이 없어 BE가
 * 401로 버리지만 조회 기록은 비로그인 허용이라 `article_opened`가 기기 없이 남아 열람을 부풀린다.
 * 좋아요·댓글·투표 같은 다른 쓰기는 여기 안 든다. 크롤러 판정이 사람을 잘못 잡아도 잃는 건
 * 분석값 하나지 그 사람의 행동이 아니어야 한다.
 *
 * @param method 요청 메서드
 * @param apiPath `/be`를 뗀 BE 경로 (`/api/v1/events`)
 */
export function isAnalyticsWrite(method: string, apiPath: string): boolean {
  return (
    method === "POST" &&
    /^\/api\/v1\/(events|articles\/[^/]+\/view)$/.test(apiPath)
  );
}

/**
 * @file 분석 헤더 계약 (KAN-542, BE KAN-538). 메인 API로 가는 모든 요청에 싣는 헤더 넷과,
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
  /** 서비스 안 어느 화면에서 눌렀는지 (`home_feed`, `reels`, `reels_deeplink`, `hot`, `share_link`) */
  entry: "X-Plick-Entry",
} as const;

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

/**
 * 화면 경로에서 진입 화면(`X-Plick-Entry`)을 고른다. 릴스 피드는 `reels`, 릴 하나를 바로 여는
 * 딥링크(`/reels/{id}`)는 `reels_deeplink`, 홈은 `home_feed`. `hot`과 `share_link`는 화면
 * 경로만으로는 알 수 없어(핫이슈는 홈 안의 구획이고 공유 링크는 표식이 없다) 여기서 내지
 * 않는다 - 그 값은 클라이언트 이벤트 작업(KAN-543)이 요청마다 실어 주는 몫이다.
 *
 * @param pathname 페이지 요청이면 그 경로, `/be` fetch면 Referer의 경로
 * @returns 진입 화면 값. 모르면 null(헤더를 안 싣고 BE가 `unknown`으로 접는다)
 */
export function resolveEntryPoint(pathname: string): string | null {
  if (pathname === "/") return "home_feed";
  if (pathname === "/reels") return "reels";
  if (/^\/reels\/[^/]+$/.test(pathname)) return "reels_deeplink";
  return null;
}

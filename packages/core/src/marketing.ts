/**
 * @file 마케팅 유입 값 여섯 개(KAN-577, BE KAN-575). utm 셋, 외부 유입 도메인, 광고 클릭 식별자와
 * 그 출처를 URL과 Referer에서 읽어 쿠키 하나에 보관하고, 분석 헤더로 펴 준다.
 *
 * `plick_path`(KAN-542)와 같은 자리에서 같은 방식으로 돈다. 두 앱 `proxy.ts`가 페이지 요청마다
 * `resolveMarketing`을 부르고, 결과를 `marketingHeaders`로 펴 나가는 요청 헤더에 찍는다.
 *
 * 형식 규칙은 BE `RequestOrigin.Marketing`을 따른다. 여기서 거르는 이유는 둘이다. 헤더에는
 * Latin-1 밖 문자를 실을 수 없어 `?utm_campaign=추석`을 그대로 `Headers.set`하면 프록시가 던진다.
 * 그리고 쿠키는 브라우저에서 고칠 수 있다. 형식 밖이면 헤더를 빼고 BE가 `unknown`이나 빈 값으로
 * 접게 둔다. utm의 대소문자는 BE가 접으므로 원값을 넘기고, 클릭 식별자는 절대 접지 않는다.
 */

import { ANALYTICS_HEADERS } from "./analytics";

/**
 * 마케팅 값 여섯 개를 한 덩어리로 들고 있는 쿠키 (KAN-577). 값은 `URLSearchParams` 문자열이다.
 * 읽는 쪽이 프록시뿐이라 HttpOnly이고 수명은 분석 쿠키(`ANALYTICS_COOKIE_MAX_AGE`)와 같다.
 */
export const MARKETING_COOKIE = "plick_mkt";

/** 보관하는 마케팅 값. 모르는 칸은 키가 없다. */
export interface Marketing {
  utmCampaign?: string;
  utmMedium?: string;
  utmContent?: string;
  /** 외부 유입 호스트(소문자). 경로·쿼리는 개인정보가 섞일 수 있어 남기지 않는다 */
  referrer?: string;
  /** 광고 클릭 식별자 원값. 전환 회신에서 플랫폼 기록과 정확히 대조돼야 해 대소문자를 보존한다 */
  clickId?: string;
  clickSource?: string;
}

/**
 * 클릭 식별자 파라미터 → `click_source` 값. 앞이 우선이다. 광고 매체가 늘면 이 목록만 고친다 -
 * BE는 `click_source` 형식만 검사하고 원값을 발행하므로 서버 배포가 필요 없다(KAN-552).
 */
export const CLICK_ID_PARAMS = [
  ["fbclid", "meta"],
  ["gclid", "google"],
  ["ttclid", "tiktok"],
] as const;

/** utm 쿼리 파라미터와 BE 길이 상한. 상한을 넘으면 BE가 자르지 않고 `unknown`으로 접는다. */
const UTM_PARAMS = [
  ["utmCampaign", "utm_campaign", 64],
  ["utmMedium", "utm_medium", 64],
  ["utmContent", "utm_content", 128],
] as const;

/**
 * 새 유입으로 보는 쿼리 파라미터. `plick_path`가 읽는 `path`·`utm_source`도 포함한다 - 공유 링크
 * (`?path=share`)로 새로 들어온 사람에게 지난 캠페인 값이 남으면 안 된다.
 */
const TOUCH_PARAMS = [
  "path",
  "utm_source",
  ...UTM_PARAMS.map(([, param]) => param),
  ...CLICK_ID_PARAMS.map(([param]) => param),
];

/** BE utm 패턴. 대소문자는 BE가 접으므로 여기서는 둘 다 받는다. 공백·제어 문자는 막는다. */
const UTM_PATTERN = /^[A-Za-z0-9_.:+~|-]+$/;

/** BE 클릭 식별자 패턴. 상한과 로그 주입 차단만 건다. */
const CLICK_ID_PATTERN = /^[A-Za-z0-9_.:=~-]{1,128}$/;

/** `click_source` 형식. `path`와 같은 규칙이다. */
const CLICK_SOURCE_PATTERN = /^[a-z0-9_]{1,32}$/;

/** 호스트 형식. 상한은 BE와 같은 253자(DNS 이름 최대 길이). */
const HOST_PATTERN = /^[a-z0-9.-]{1,253}$/;

/**
 * 외부 유입으로 치지 않는 호스트. 소셜 로그인 제공자에서 콜백으로 돌아오는 요청은 Referer가
 * 제공자 도메인이라, 걸러내지 않으면 로그인할 때마다 유입이 `kakao.com`으로 덮인다. 콜백이
 * 302로 홈에 보낸 뒤의 요청도 같은 Referer를 들고 온다(리다이렉트는 Referer를 유지한다).
 */
const AUTH_HOSTS = [
  "accounts.google.com",
  "kauth.kakao.com",
  "appleid.apple.com",
];

/** 자기 서비스 도메인. PC·모바일 전환 배너로 건너온 요청은 외부 유입이 아니다. */
const OWN_DOMAIN = "plick.co.kr";

function isUtmValue(value: string, max: number): boolean {
  return value.length <= max && UTM_PATTERN.test(value);
}

/** 형식에 맞는 칸만 남긴다. 쿠키와 URL 둘 다 이걸 거친다. */
function sanitize(input: Marketing): Marketing {
  const out: Marketing = {};
  for (const [key, , max] of UTM_PARAMS) {
    const value = input[key]?.trim();
    if (value && isUtmValue(value, max)) out[key] = value;
  }
  if (input.referrer && HOST_PATTERN.test(input.referrer)) {
    out.referrer = input.referrer;
  }
  if (
    input.clickId &&
    input.clickSource &&
    CLICK_ID_PATTERN.test(input.clickId) &&
    CLICK_SOURCE_PATTERN.test(input.clickSource)
  ) {
    out.clickId = input.clickId;
    out.clickSource = input.clickSource;
  }
  return out;
}

/** 쿠키 안 키 이름. 쿠키는 요청마다 실리니 짧게 둔다. */
const KEY_TO_COOKIE: Record<keyof Marketing, string> = {
  utmCampaign: "c",
  utmMedium: "m",
  utmContent: "t",
  referrer: "r",
  clickId: "i",
  clickSource: "s",
};

/**
 * 쿠키 값을 읽는다. 형식 밖의 칸은 버린다.
 *
 * @param value `plick_mkt` 쿠키 값. 없으면 빈 값
 */
export function parseMarketingCookie(value: string | undefined): Marketing {
  if (!value) return {};
  const params = new URLSearchParams(value);
  const raw: Marketing = {};
  for (const key of Object.keys(KEY_TO_COOKIE) as (keyof Marketing)[]) {
    const v = params.get(KEY_TO_COOKIE[key]);
    if (v) raw[key] = v;
  }
  return sanitize(raw);
}

/**
 * 쿠키에 심을 문자열로 만든다. 칸이 하나도 없으면 빈 문자열.
 *
 * @param marketing `resolveMarketing`이 정한 값
 */
export function serializeMarketingCookie(marketing: Marketing): string {
  const params = new URLSearchParams();
  for (const key of Object.keys(KEY_TO_COOKIE) as (keyof Marketing)[]) {
    const v = marketing[key];
    if (v) params.set(KEY_TO_COOKIE[key], v);
  }
  return params.toString();
}

/**
 * Referer에서 외부 유입 호스트를 뽑는다. 자기 도메인, 개발 중인 자기 호스트, 소셜 로그인
 * 제공자는 외부 유입이 아니라 null이다.
 *
 * @param referer 페이지 요청의 `Referer` 헤더. 브라우저의 `document.referrer`와 같은 값이다
 * @param ownHost 이번 요청의 호스트(`localhost` 등 개발 환경 대비)
 * @returns 소문자 호스트. 외부 유입이 아니거나 읽을 수 없으면 null
 */
export function readReferrerHost(
  referer: string | null,
  ownHost: string,
): string | null {
  if (!referer) return null;
  let host: string;
  try {
    host = new URL(referer).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (!HOST_PATTERN.test(host)) return null;
  if (host === ownHost.toLowerCase()) return null;
  if (host === OWN_DOMAIN || host.endsWith(`.${OWN_DOMAIN}`)) return null;
  if (AUTH_HOSTS.includes(host)) return null;
  return host;
}

/**
 * 이번 페이지 요청의 마케팅 값을 정한다 (KAN-577).
 *
 * 여섯 칸을 한 덩어리로 다룬다. URL에 유입 파라미터가 하나라도 있거나 외부 Referer가 있으면
 * 새 유입이라 덩어리를 통째로 갈고, 둘 다 없으면(안에서 옮겨 다니는 요청, 직접 친 주소) 쿠키
 * 값을 그대로 쓴다. 칸마다 따로 유지하면 캠페인 A의 `utm_campaign`에 캠페인 B의 `fbclid`가
 * 붙는 식으로 서로 다른 유입이 한 행에 섞인다. 클릭 식별자와 출처는 둘이 한 쌍이라 더 그렇다.
 *
 * `/be` fetch에서는 URL과 Referer가 자기 페이지라 부르지 않고 쿠키 값만 쓴다(호출부 몫).
 *
 * @param stored 쿠키에서 읽은 값(`parseMarketingCookie`)
 * @param searchParams 진입 URL의 쿼리
 * @param referrerHost `readReferrerHost`의 결과
 * @returns 이번 요청에 쓸 값과, 쿠키를 새로 심어야 하는지
 */
export function resolveMarketing(
  stored: Marketing,
  searchParams: URLSearchParams,
  referrerHost: string | null,
): { marketing: Marketing; touched: boolean } {
  const touched =
    !!referrerHost || TOUCH_PARAMS.some((param) => searchParams.has(param));
  if (!touched) return { marketing: stored, touched: false };

  const raw: Marketing = {};
  for (const [key, param] of UTM_PARAMS) {
    const v = searchParams.get(param);
    if (v) raw[key] = v;
  }
  if (referrerHost) raw.referrer = referrerHost;
  for (const [param, source] of CLICK_ID_PARAMS) {
    const v = searchParams.get(param)?.trim();
    if (v && CLICK_ID_PATTERN.test(v)) {
      raw.clickId = v;
      raw.clickSource = source;
      break;
    }
  }
  return { marketing: sanitize(raw), touched: true };
}

/** 마케팅 칸 → 분석 헤더 이름. */
const HEADER_NAMES: Record<keyof Marketing, string> = {
  utmCampaign: ANALYTICS_HEADERS.utmCampaign,
  utmMedium: ANALYTICS_HEADERS.utmMedium,
  utmContent: ANALYTICS_HEADERS.utmContent,
  referrer: ANALYTICS_HEADERS.referrer,
  clickId: ANALYTICS_HEADERS.clickId,
  clickSource: ANALYTICS_HEADERS.clickSource,
};

/**
 * 마케팅 값을 분석 헤더로 편다. 없는 칸은 키를 빼 BE가 `unknown`이나 빈 값으로 접게 둔다.
 *
 * @param marketing 이번 요청의 값
 */
export function marketingHeaders(marketing: Marketing): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(HEADER_NAMES) as (keyof Marketing)[]) {
    const v = marketing[key];
    if (v) out[HEADER_NAMES[key]] = v;
  }
  return out;
}

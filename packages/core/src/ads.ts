/**
 * @file 광고(구글 애드센스) 공용 로직 (KAN-652). 게시자 ID, 스크립트 주소, ads.txt 본문,
 * 노출 모드 판정, 릴스 전면광고 끼워 넣기. 슬롯 번호와 자리별 크기는 앱마다 광고 단위가
 * 달라 각 앱 `_constants/ads.ts`에 둔다.
 */

import { type BrowserKind, PLICK_APP_UA_PATTERN } from "./analytics";

/**
 * 애드센스 게시자 ID. 브라우저에 그대로 노출되는 공개 값이라 env로 감추지 않는다.
 * 두 도메인(plick.co.kr, m.plick.co.kr)이 한 계정이다.
 */
export const ADSENSE_CLIENT = "ca-pub-1989769587706531";

/** 애드센스 로더. 사이트 소유 확인도 이 스크립트가 `<head>`에 있는 것으로 한다. */
export const ADSENSE_SCRIPT_URL = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;

/**
 * `/ads.txt` 본문. 애드센스가 요구하는 한 줄이고 마지막 값은 구글의 고정 인증 ID다.
 * 도메인 루트마다 있어야 해서 두 앱이 같은 본문을 라우트로 낸다.
 */
export function adsTxt(): string {
  return `google.com, ${ADSENSE_CLIENT.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0\n`;
}

/**
 * 광고 노출 모드.
 * - `live`: 실제 애드센스 단위. prod 빌드만.
 * - `placeholder`: 자리에 점선 상자만 그린다. dev·로컬에서 레이아웃과 E2E를 보는 용도.
 *   미승인 도메인에 실광고를 걸면 정책 위반이라 dev는 이 모드로 고정이다.
 * - `off`: 자리 자체를 안 그린다. 앱 셸(RN WebView)이 여기다.
 */
export type AdsMode = "live" | "placeholder" | "off";

/** `AdsMode` 문자열인지. env 오버라이드 값을 거를 때 쓴다. */
export function isAdsMode(value: string | undefined): value is AdsMode {
  return value === "live" || value === "placeholder" || value === "off";
}

/**
 * 이번 요청의 광고 모드. 앱 셸 안이면 끈다. 애드센스는 WebView 노출을 금지하고(앱은
 * 모바일 광고 SDK로 WebView를 등록해야 허용) 그 등록은 plick-AppShell 쪽 별도 작업이라,
 * 그때까지 앱에서는 자리를 아예 안 그린다.
 *
 * @param base 빌드가 정한 기본 모드(prod는 live, 그 밖은 placeholder)
 * @param browser UA로 가른 브라우저 종류(`resolveBrowserKind`). 전에는 레이아웃이 프록시의
 *   `X-Plick-Browser` 헤더를 읽어 넘겼고, KAN-632부터는 `AdsProvider`가 브라우저에서
 *   `navigator.userAgent`로 판정해 넘긴다. 없으면 외부 브라우저로 본다
 */
export function resolveAdsMode(
  base: AdsMode,
  browser: string | null | undefined,
): AdsMode {
  const kind = browser as BrowserKind | null | undefined;
  return kind === "plick_app" ? "off" : base;
}

/** 릴스 몇 장마다 전면광고 슬라이드를 끼우나. 티켓이 8장이다. */
/**
 * 앱 셸에서 애드센스 광고 요청을 막는 head 인라인 스크립트 본문 (KAN-632).
 *
 * 전에는 레이아웃이 `headers()`로 프록시가 가른 브라우저 종류를 읽어 앱 셸이면 로더 태그 자체를
 * 안 넣었다. 레이아웃이 요청을 읽지 않게 되면서(전 라우트 동적 렌더의 원인) 서버는 UA를 모르고,
 * 로더 태그는 애드센스 크롤러가 HTML에서 봐야 해서 JS로 늦게 넣을 수도 없다. 그래서 로더는
 * 항상 넣되, 로더보다 먼저 도는 이 동기 스크립트가 앱 셸 UA면 `adsbygoogle.pauseAdRequests = 1`을
 * 세운다. 애드센스가 동의 관리용으로 제공하는 스위치라 자동 광고를 포함해 광고 요청이 나가지
 * 않는다. 광고 단위를 안 그리는 건 `AdsProvider`가 브라우저에서 모드를 `off`로 정해 맡는다.
 *
 * @returns `<script>` 안에 그대로 넣을 JS. 실패해도 아무것도 안 하게 try로 감싼다
 */
export function adsPauseScript(): string {
  return (
    "(function(){try{" +
    `if(/${PLICK_APP_UA_PATTERN.source}/.test(navigator.userAgent)){` +
    "(window.adsbygoogle=window.adsbygoogle||[]).pauseAdRequests=1" +
    "}}catch(e){}})()"
  );
}

export const REELS_AD_INTERVAL = 8;

/**
 * 릴스 피드의 슬라이드 하나. 릴이거나 광고다. 광고 슬라이드는 릴 사이에만 들어가고,
 * `reelIndex`는 릴 배열 안 순번이라 조회 기록의 `rank`와 프리페치 계산이 이 값을 쓴다.
 */
export type ReelSlide<T> =
  | { kind: "reel"; reel: T; reelIndex: number }
  | { kind: "ad"; id: string };

/**
 * 릴 배열에 `interval`장마다 광고 슬라이드를 끼운다. 광고는 릴과 릴 사이에만 들어가서
 * 맨 끝이 광고로 끝나지 않는다. 다음 페이지가 붙으면 끼울 자리가 생겨 그때 들어간다.
 *
 * @param reels 릴 배열(페이지를 평탄화한 것)
 * @param interval 몇 장마다 끼우나. `null`이면 광고 없이 릴만 감싼다(모드 off)
 * @example interleaveReelAds([a,b,c], 2) // [reel a, reel b, ad-1, reel c]
 */
export function interleaveReelAds<T>(
  reels: readonly T[],
  interval: number | null,
): ReelSlide<T>[] {
  const slides: ReelSlide<T>[] = [];
  let ads = 0;
  reels.forEach((reel, reelIndex) => {
    if (interval !== null && reelIndex > 0 && reelIndex % interval === 0) {
      ads += 1;
      slides.push({ kind: "ad", id: `ad-${ads}` });
    }
    slides.push({ kind: "reel", reel, reelIndex });
  });
  return slides;
}

/**
 * 슬라이드 순번이 가리키는 릴 순번. 광고 슬라이드면 바로 앞 릴의 순번이다. "지금까지
 * 몇 번째 릴까지 봤나"라 프리페치 남은 수와 조회 기록이 이 값을 쓴다.
 *
 * @param slides `interleaveReelAds` 결과
 * @param index 활성 슬라이드 순번
 */
export function reelIndexAt<T>(
  slides: readonly ReelSlide<T>[],
  index: number,
): number {
  for (let i = Math.min(index, slides.length - 1); i >= 0; i -= 1) {
    const slide = slides[i];
    if (slide?.kind === "reel") return slide.reelIndex;
  }
  return 0;
}

/**
 * 카카오 애드핏 로더 (KAN-652). 애드센스가 "가치가 별로 없는 콘텐츠"로 거절한 뒤 넣은 두 번째
 * 광고망이다. 로더는 실행될 때 DOM에 있는 `.kakao_ad_area` 상자를 채우고 끝이라, 애드센스처럼
 * head에 한 번 두지 않고 상자를 마운트할 때마다 상자 옆에 새 `<script>`로 끼워 넣는다
 * (각 앱 `AdSlot`의 `AdfitBox`).
 */
export const ADFIT_SCRIPT_URL = "https://t1.daumcdn.net/kas/static/ba.min.js";

/**
 * 애드핏 상자의 크기. 애드핏 단위는 `data-ad-width`·`data-ad-height`가 둘 다 고정 px라 폭을
 * 채우는 애드센스 배너와 달리 폭이 꼭 있어야 한다. 폭이 비어 있으면 앱이 정한 배너 폭(PC 728,
 * 모바일 320)을 쓰고, 높이가 없는 자리(릴스 전면)는 애드핏 규격이 없어 `null`이다.
 *
 * @param unit 자리의 크기. `width`·`height`는 px이고 없으면 채우는 자리다
 * @param fallbackWidth 폭이 비어 있을 때 쓸 배너 폭(px)
 * @example adfitSize({ height: 90 }, 728) // { width: 728, height: 90 }
 * @example adfitSize({}, 320) // null
 */
export function adfitSize(
  unit: { width?: number; height?: number },
  fallbackWidth: number,
): { width: number; height: number } | null {
  if (unit.height === undefined) return null;
  return { width: unit.width ?? fallbackWidth, height: unit.height };
}

/**
 * 자리 하나가 live 모드에서 어느 광고망 상자를 그리나 (KAN-652). 애드핏 ID가 있으면 애드핏,
 * 아니면 애드센스 번호가 있을 때 애드센스, 둘 다 비면 `null`(자리를 아예 안 그린다). 애드핏이
 * 먼저인 이유는 애드센스가 미승인이라 번호가 있어도 채워지지 않기 때문이다.
 *
 * @param unit 자리의 광고 단위. `slot`은 애드센스 번호, `adfit`은 애드핏 ID
 * @example adNetworkFor({ slot: "123", adfit: "DAN-1" }) // "adfit"
 * @example adNetworkFor({ slot: "", adfit: "" }) // null
 */
export function adNetworkFor(unit: {
  slot: string;
  adfit: string;
}): "adfit" | "adsense" | null {
  if (unit.adfit) return "adfit";
  if (unit.slot) return "adsense";
  return null;
}

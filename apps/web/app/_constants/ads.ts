/**
 * @file 광고 자리와 노출 모드 (KAN-652, 데스크톱 웹). 게시자 ID와 모드 판정은
 * `@plick/core/ads`, 여기는 이 앱의 광고 단위 번호와 자리별 크기만 둔다.
 *
 * 크기가 px인 이유: 애드센스 고정 크기 단위(300×250, 160×600)는 실제 픽셀 규격이라
 * rem 배율(KAN-574)을 태우면 규격에서 벗어나 채워지지 않는다. 광고 상자와 그 자리를
 * 미리 잡는 wrapper만 px이고 주변 여백은 토큰이다. 가로 배너는 폭을 컬럼에 맞추고
 * 높이만 고정해 CLS를 막는다(애드센스의 "높이 고정 반응형" 변형).
 */

import { type AdsMode, isAdsMode } from "@plick/core/ads";
import { IS_PRODUCTION_SITE } from "@/_constants/site";

/**
 * 빌드가 정한 기본 모드. prod 빌드만 live이고 dev·로컬은 placeholder다.
 * `NEXT_PUBLIC_ADS_MODE`로 덮을 수 있다(로컬에서 off로 보고 싶을 때). 앱 셸 안에서
 * off로 접는 건 `AdsProvider`가 브라우저에서 `resolveAdsMode`로 한다 (KAN-667).
 */
export const ADS_BASE_MODE: AdsMode = (() => {
  const override = process.env.NEXT_PUBLIC_ADS_MODE;
  if (isAdsMode(override)) return override;
  return IS_PRODUCTION_SITE ? "live" : "placeholder";
})();

/** 이 앱의 광고 자리 이름. 자리마다 애드센스 광고 단위 하나가 대응한다. */
export type AdPlacement =
  | "skyscraper"
  | "feedBanner"
  | "railBanner"
  | "railRect"
  | "bottomBanner"
  | "reel";

/**
 * 광고 단위 하나의 규격.
 * - `slot`: 애드센스 광고 단위 번호(`data-ad-slot`). 승인 뒤 대시보드에서 만든 번호를 채운다.
 * - `adfit`: 카카오 애드핏 광고 단위 ID(`data-ad-unit`, DAN-으로 시작). 매체 심사 뒤 채운다 (KAN-652).
 *   둘 다 비어 있으면 live 모드에서 그 자리를 아예 그리지 않고, 둘 다 있으면 애드핏이 먼저다
 *   (애드센스가 미승인이라 번호가 있어도 채워지지 않는다).
 * - `width`: px. 없으면 상자 폭을 채운다.
 * - `height`: px. 없으면 상자 높이를 채운다(릴스 전면).
 */
export interface AdUnit {
  slot: string;
  adfit: string;
  width?: number;
  height?: number;
}

/**
 * 자리별 광고 단위. 애드센스 번호는 승인 뒤, 애드핏 ID는 매체 심사 뒤 채운다.
 * 애드핏 PC 규격은 728×90, 300×250, 250×250, 160×600이라 세로 배너·사각형·가로 배너에 맞고,
 * 높이 60인 레일 소형 배너와 전면 릴스는 규격이 없어 애드센스 전용으로 남는다.
 */
export const AD_UNITS: Record<AdPlacement, AdUnit> = {
  /* 좌측 여백 세로 배너. 컨테이너 바깥이라 페이지 폭(80rem×110%)에 광고 폭과 거터가
     더 남는 화면에서만 보인다 */
  skyscraper: { slot: "", adfit: "", width: 160, height: 600 },
  /* 홈 핫이슈와 새 이슈 사이 가로 배너 */
  feedBanner: { slot: "", adfit: "", height: 90 },
  /* 우측 레일 급상승 아래 소형 배너 */
  railBanner: { slot: "", adfit: "", height: 60 },
  /* 우측 레일 맨 아래 사각형. 레일 폭 18rem×110%≈317px 안에 300이 든다 */
  railRect: { slot: "", adfit: "", width: 300, height: 250 },
  /* 본문 컬럼 맨 아래, 푸터 위 가로 배너 */
  bottomBanner: { slot: "", adfit: "", height: 90 },
  /* 릴스 전면 슬라이드. 9:16 카드를 그대로 채운다 */
  reel: { slot: "", adfit: "" },
};

/** 우측 레일이 보이는 조건. `SideRail`의 `hidden lg:flex`와 같은 문턱이다. */
export const RAIL_MEDIA_QUERY = "(min-width: 64rem)";

/**
 * 좌측 세로 배너가 보이는 조건. 페이지 80rem에 html 110% 배율을 곱한 1408px과
 * 양쪽 광고 폭·거터(약 190px씩)를 더한 1800px을 미디어 쿼리 기준(16px)의 rem으로 적은 값이다. 그보다 좁으면 본문을 가리므로 숨긴다.
 */
export const SKYSCRAPER_MEDIA_QUERY = "(min-width: 112.5rem)";

/**
 * 애드핏 가로 배너 폭 (KAN-652). 애드핏은 폭도 고정 px라, 폭을 채우던 가로 배너 자리(`width`
 * 없음)에는 PC 규격 728을 쓴다. 본문 컬럼이 그보다 넓어 `AdSlot` wrapper가 가운데 둔다.
 */
export const ADFIT_BANNER_WIDTH = 728;

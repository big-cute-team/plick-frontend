/**
 * @file 광고 자리와 노출 모드 (KAN-652, 모바일 웹). 게시자 ID와 모드 판정은
 * `@plick/core/ads`, 여기는 이 앱의 광고 단위 번호와 자리별 크기만 둔다. 웹과 광고
 * 단위가 달라 상수도 앱마다 따로다.
 *
 * 크기가 px인 이유: 애드센스 고정 크기 단위(300×250 등)는 실제 픽셀 규격이라 rem
 * 배율(KAN-574)을 태우면 규격에서 벗어나 채워지지 않는다. 광고 상자와 그 자리를
 * 미리 잡는 wrapper만 px이고 주변 여백은 토큰이다. 가로 배너는 폭을 셸에 맞추고
 * 높이만 고정해 CLS를 막는다(애드센스의 "높이 고정 반응형" 변형).
 *
 * 티켓이 "PC를 참고해 최소화"라 자리는 홈 둘, 기사 하나, 릴스 전면뿐이다. 하단
 * 앵커 광고는 탭바와 겹쳐 쓰지 않는다.
 */

import { type AdsMode, isAdsMode } from "@plick/core/ads";
import { IS_PRODUCTION_SITE } from "@/_constants/site";

/**
 * 빌드가 정한 기본 모드. prod 빌드만 live이고 dev·로컬은 placeholder다.
 * `NEXT_PUBLIC_ADS_MODE`로 덮을 수 있다(로컬에서 off로 보고 싶을 때). 앱 셸 안에서
 * off로 접는 건 `AdsProvider`가 브라우저에서 UA로 판정해 `resolveAdsMode`로 한다 (KAN-632).
 */
export const ADS_BASE_MODE: AdsMode = (() => {
  const override = process.env.NEXT_PUBLIC_ADS_MODE;
  if (isAdsMode(override)) return override;
  return IS_PRODUCTION_SITE ? "live" : "placeholder";
})();

/** 이 앱의 광고 자리 이름. 자리마다 애드센스 광고 단위 하나가 대응한다. */
export type AdPlacement = "homeFeed" | "homeBottom" | "article" | "reel";

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
 * 애드핏 모바일 규격은 320×50, 320×100, 300×250, 250×250이라 홈 배너 둘(320×100)과 기사
 * 사각형(300×250)에 맞고, 전면 릴스는 규격이 없어 애드센스 전용으로 남는다.
 */
export const AD_UNITS: Record<AdPlacement, AdUnit> = {
  /* 홈 핫이슈와 새 이슈 사이 가로 배너(320×100 규격 높이) */
  homeFeed: { slot: "", adfit: "", height: 100 },
  /* 홈 기사 더 보기 아래, 소개문 위 가로 배너 */
  homeBottom: { slot: "", adfit: "", height: 100 },
  /* 기사 본문 끝, 함께 보면 좋은 기사 위 사각형. 셸 폭 480 안에 300이 든다 */
  article: { slot: "", adfit: "", width: 300, height: 250 },
  /* 릴스 전면 슬라이드. 화면을 그대로 채운다 */
  reel: { slot: "", adfit: "" },
};

/**
 * 애드핏 가로 배너 폭 (KAN-652). 애드핏은 폭도 고정 px라, 폭을 채우던 가로 배너 자리(`width`
 * 없음)에는 모바일 규격 320을 쓴다. 셸 최대폭 480 안에서 `AdSlot` wrapper가 가운데 둔다.
 */
export const ADFIT_BANNER_WIDTH = 320;

/**
 * @file 릴스 피드(세로 캐러셀)와 릴 세부 바텀시트의 기하·애니메이션 상수.
 *
 * 시트(ReelDetailSheet)와 릴의 칩·제목(ReelItem)이 같은 값을 공유해야
 * 한 몸으로 오르내리므로, 두 컴포넌트가 함께 참조하는 단일 출처로 둔다.
 */
import type { EmblaOptionsType } from "embla-carousel";

/**
 * 릴스 세로 캐러셀(Embla) 옵션 — 딥링크용 `startIndex`만 호출부에서 덧붙인다.
 *
 * - `axis: "y"` 세로 넘김. `align`은 릴이 뷰포트를 꽉 채우므로 사실상 무의미하지만 명시한다.
 * - `skipSnaps: false` 아무리 세게 튕겨도 한 번에 한 장만 넘어간다. 릴스의 기본 감각이다.
 * - `dragThreshold` 이 거리(px)를 넘겨야 드래그로 인정한다. 기본 10보다 낮춰 짧은 플릭도 받는다.
 * - `duration` 스냅 애니메이션 길이(Embla 내부 단위, 기본 25). 낮출수록 빠르게 붙는다.
 */
export const REELS_CAROUSEL_OPTIONS: EmblaOptionsType = {
  axis: "y",
  align: "start",
  loop: false,
  skipSnaps: false,
  dragThreshold: 8,
  duration: 22,
};

/** 시트 상단을 이 거리(px) 이상 끌어내리면 닫는다 */
export const DRAG_CLOSE_THRESHOLD = 100;

/** 릴 섹션 대비 시트 높이 비율 — 피그마 352/480.7 */
export const SHEET_HEIGHT_RATIO = 0.73;

/** 칩·제목 블록 하단과 시트 상단 라인 사이 간격(px) — 피그마 9.9(0.55배율) */
export const SHEET_TITLE_GAP = 18;

/** 시트와 칩·제목이 공유하는 슬라이드 타이밍 — 두 요소가 한 몸처럼 움직이는 전제 */
export const SHEET_TRANSITION =
  "transform 320ms cubic-bezier(0.32, 0.72, 0, 1)";

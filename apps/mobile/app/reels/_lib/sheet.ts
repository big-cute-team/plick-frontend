/**
 * @file 릴 세부 바텀시트의 기하·애니메이션 상수와 순수 계산.
 *
 * 시트(ReelDetailSheet)와 릴의 칩·제목(ReelItem)이 같은 값을 공유해야
 * 한 몸으로 오르내리므로, 두 컴포넌트가 함께 참조하는 단일 출처로 둔다.
 */

/** 시트 상단을 이 거리(px) 이상 끌어내리면 닫는다 */
export const DRAG_CLOSE_THRESHOLD = 100;

/** 릴 섹션 대비 시트 높이 비율 — 피그마 352/480.7 */
export const SHEET_HEIGHT_RATIO = 0.73;

/** 칩·제목 블록 하단과 시트 상단 라인 사이 간격(px) — 피그마 9.9(0.55배율) */
export const SHEET_TITLE_GAP = 18;

/** 시트와 칩·제목이 공유하는 슬라이드 타이밍 — 두 요소가 한 몸처럼 움직이는 전제 */
export const SHEET_TRANSITION =
  "transform 320ms cubic-bezier(0.32, 0.72, 0, 1)";

/**
 * 칩·제목이 도킹 지점(시트 상단 라인 위 {@link SHEET_TITLE_GAP})까지
 * 올라갈 거리(px). 위로 올라가므로 음수다.
 *
 * @param sectionRect - 릴 섹션의 화면 사각형
 * @param titleRect - 칩·제목 블록의 화면 사각형
 */
export function titleLiftDistance(
  sectionRect: DOMRect,
  titleRect: DOMRect,
): number {
  const sheetTop = sectionRect.bottom - sectionRect.height * SHEET_HEIGHT_RATIO;
  return sheetTop - SHEET_TITLE_GAP - titleRect.bottom;
}

/**
 * 드래그 중 칩·제목의 실제 오프셋(px) — 도킹 지점(위)~원래 자리(0) 사이로 클램프.
 *
 * 시트를 원래 자리 밑까지 내려도 제목은 제 위치 아래로 내려가지 않는다.
 *
 * @param lift - {@link titleLiftDistance}가 준 도킹 거리(음수)
 * @param dragY - 현재 드래그로 내린 거리(양수)
 */
export function clampTitleOffset(lift: number, dragY: number): number {
  return Math.min(0, lift + dragY);
}

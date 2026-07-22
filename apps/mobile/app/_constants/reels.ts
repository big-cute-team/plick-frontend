/**
 * @file 릴 세부 바텀시트의 기하·애니메이션 상수.
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

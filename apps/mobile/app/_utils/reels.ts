/**
 * @file 릴 세부 바텀시트의 순수 기하 계산.
 */
import { SHEET_HEIGHT_RATIO, SHEET_TITLE_GAP } from "@/_constants/reels";

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

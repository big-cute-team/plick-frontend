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

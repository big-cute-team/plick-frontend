/**
 * @file 바텀시트 닫기 제스처의 기하·타이밍 상수 (KAN-514).
 * 릴스 시트(`_constants/reels.ts`)는 열고 닫는 드래그가 릴 제스처와 한 몸이라
 * 상수도 거기 있다. 이건 `LiveSheet`(선수 스탯 등) 전용이다.
 */

/**
 * 이 거리(px) 이상 끌어내린 뒤 손을 떼야 시트가 닫힌다.
 *
 * 당겨서 새로고침 문턱(64px)보다 크게 잡는다. 시트 안은 스크롤되는 지면이라
 * 맨 위에서 손가락이 조금 흘러내리는 일이 잦은데, 그때마다 닫히면 스탯을 읽다
 * 지면이 사라진다. 반대로 너무 멀면 닫으려고 화면 절반을 쓸어야 한다.
 */
export const SHEET_DISMISS_DISTANCE = 96;

/**
 * 손가락이 이만큼(px) 움직여야 제스처의 방향을 판정한다.
 * 첫 픽셀로 정하면 시트 안을 위로 스크롤하려다 1px 아래로 흘린 것까지
 * 닫기로 오인한다 (당겨서 새로고침과 같은 이유·같은 값).
 */
export const SHEET_DIRECTION_SLOP = 8;

/** 닫히며 아래로 빠지는 시간(ms). 아래 전환과 같은 값이어야 한다. */
export const SHEET_DISMISS_MS = 220;

/** 시트가 제자리로 돌아가거나 아래로 빠질 때의 곡선 — 릴 시트와 같은 감속. */
export const SHEET_DISMISS_TRANSITION =
  "transform 220ms cubic-bezier(0.32, 0.72, 0, 1)";

/**
 * @file 안내 토스트 상수. 모바일 `_constants/feedback.ts`의 게스트 절만 가져왔다 —
 * 웹에는 전역 에러 토스트(KAN-447)가 없어 스토어 쪽 상수는 아직 없다.
 */

/**
 * 게스트 안내 토스트가 떠 있는 시간(ms) — KAN-514.
 * "지금부터 기록이 쌓이고, 언제까지 연동하면 이어진다"는 처음 보는 설명이라
 * 한 번에 읽고 넘길 시간을 넉넉히 준다.
 */
export const GUEST_NOTICE_DURATION_MS = 5000;

/**
 * 한 줄 토스트가 떠 있는 시간(ms) (KAN-696, 모바일 `ERROR_TOAST_DURATION_MS`와 같은 값). 예측 탭의
 * `방금 마감됐어요`처럼 지나가는 안내가 쓴다. 한 줄 문구를 읽기에 충분한 길이다.
 */
export const ERROR_TOAST_DURATION_MS = 3000;

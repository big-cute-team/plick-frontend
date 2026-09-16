/**
 * @file 전역 에러 피드백(토스트) 상수 (KAN-447).
 */

/** 에러 토스트가 떠 있는 시간(ms) — 한 줄 문구를 읽기에 충분한 길이. */
export const ERROR_TOAST_DURATION_MS = 3000;

/** BE가 사용자용 메시지를 안 준 실패(네트워크 순단 등)에 쓰는 기본 문구. */
export const ERROR_TOAST_FALLBACK =
  "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.";

/**
 * 게스트 안내 토스트가 떠 있는 시간(ms) — KAN-514.
 * 에러 토스트보다 길게 둔다. 실패 알림이 아니라 "지금부터 기록이 쌓이고, 언제까지
 * 연동하면 이어진다"는 처음 보는 설명이라 한 번에 읽고 넘길 시간이 더 필요하다.
 */
export const GUEST_NOTICE_DURATION_MS = 5000;

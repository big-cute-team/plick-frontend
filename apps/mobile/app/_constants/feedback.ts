/**
 * @file 전역 에러 피드백(토스트) 상수 (KAN-447).
 */

/** 에러 토스트가 떠 있는 시간(ms) — 한 줄 문구를 읽기에 충분한 길이. */
export const ERROR_TOAST_DURATION_MS = 3000;

/** BE가 사용자용 메시지를 안 준 실패(네트워크 순단 등)에 쓰는 기본 문구. */
export const ERROR_TOAST_FALLBACK =
  "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.";

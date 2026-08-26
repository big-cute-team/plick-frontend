/**
 * 복사 버튼의 표시 상태 (KAN-312, web 이식 KAN-349).
 *
 * `failed`는 클립보드가 막힌 환경에서만 나온다 — 버튼을 실패로 물들이는 게 아니라
 * 주소를 직접 복사하라는 안내로 바꿔 다는 신호다.
 */
export type CopyStatus = "idle" | "copied" | "failed";

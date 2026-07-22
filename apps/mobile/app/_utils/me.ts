/**
 * 닉네임 변경 가능 시각 안내 문구용 포맷 — "7월 28일 14:38".
 * BE가 KST 오프셋의 ISO 문자열을 주지만, 사용자의 기기 시간대와 무관하게
 * 항상 KST로 보여주도록 타임존을 고정한다.
 *
 * @param iso `nicknameChangeableAt` ISO 문자열 (예: "2026-07-28T14:38:45+09:00")
 */
export function formatChangeableAt(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

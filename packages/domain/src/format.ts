/**
 * @file 공용 포맷 유틸 — 수치 축약·아바타 이니셜. 두 앱에 동일 구현으로 복제돼
 * 있던 것을 구조 감사(2026-07-16)로 승격했다(ADR 0018).
 */

/**
 * 수치를 축약 표기로 포맷한다.
 *
 * @example
 * formatCount(12400); // "12.4K"
 * formatCount(940); // "940"
 */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  const k = n / 1000;
  return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`;
}

/**
 * 핸들에서 아바타 이니셜 2글자를 뽑는다.
 *
 * @example
 * avatarInitials("@kop_anfield"); // "KO"
 */
export function avatarInitials(handle: string): string {
  return handle.replace("@", "").slice(0, 2).toUpperCase();
}

/**
 * 닉네임 변경 가능 시각 안내 문구용 포맷 — "7월 28일 14:38".
 * BE가 KST 오프셋의 ISO 문자열을 주지만, 사용자의 기기 시간대와 무관하게
 * 항상 KST로 보여주도록 타임존을 고정한다. 모바일 `_utils/me.ts`에 있던 것을
 * web 이식(KAN-319)에서 승격했다.
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

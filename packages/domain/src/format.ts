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

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * ISO 시각을 상대 표기("2분 전")로 바꾼다. 하루를 넘기면 날짜로 떨어뜨린다 (KAN-271).
 *
 * BE 값에 이미 KST 오프셋(+09:00)이 박혀 있으므로 추가 타임존 보정을 넣으면
 * 9시간이 밀린다. `Date`가 오프셋을 그대로 해석하게 두고 차이만 계산한다.
 * 모바일 `_utils/time.ts`에 있던 것을 web 이식(KAN-321)에서 승격했다.
 *
 * @param iso 발행 시각 (예: `2026-07-21T13:27:32.255079+09:00`)
 * @param now 비교 기준 시각. 테스트에서 고정값을 넣으려고 열어 둔다.
 * @example
 * formatRelativeTime("2026-07-21T13:27:32+09:00"); // "2분 전"
 */
export function formatRelativeTime(
  iso: string,
  now: Date = new Date(),
): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";

  const diff = now.getTime() - at.getTime();
  if (diff < MINUTE) return "방금";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}분 전`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}시간 전`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}일 전`;

  return `${at.getMonth() + 1}월 ${at.getDate()}일`;
}

/**
 * @file 시각 표시 유틸. BE는 발행 시각을 ISO-8601로 주고 화면은 "2분 전"처럼
 * 상대 시각으로 보여주므로 그 변환을 여기서 한다 (KAN-271).
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * ISO 시각을 상대 표기로 바꾼다. 하루를 넘기면 날짜로 떨어뜨린다.
 *
 * BE 값에 이미 KST 오프셋(+09:00)이 박혀 있으므로 추가 타임존 보정을 넣으면
 * 9시간이 밀린다. `Date`가 오프셋을 그대로 해석하게 두고 차이만 계산한다.
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

import type { DebateListItem } from "./types";

/** 마감된 항목은 뒤로 보내고 각 그룹 안에서는 서버 순서를 유지한다. */
export function closedLast<T>(
  items: readonly T[],
  isClosed: (item: T) => boolean,
): T[] {
  const open: T[] = [];
  const closed: T[] = [];
  for (const item of items) (isClosed(item) ? closed : open).push(item);
  return [...open, ...closed];
}

export function isBalanceClosed(
  debate: Pick<DebateListItem, "contentType" | "closesAt">,
  now = Date.now(),
): boolean {
  return (
    debate.contentType === "FINISH" ||
    (debate.closesAt !== null && new Date(debate.closesAt).getTime() <= now)
  );
}

/**
 * 진행 중인 항목만 남긴다 (KAN-710). 홈 투표 띠가 마감된 투표를 빼고 돌릴 때 쓴다. 판정은
 * {@link isBalanceClosed}와 같고 순서는 서버 순서 그대로다.
 */
export function openDebates<
  T extends Pick<DebateListItem, "contentType" | "closesAt">,
>(items: readonly T[], now = Date.now()): T[] {
  return items.filter((item) => !isBalanceClosed(item, now));
}

export const PARTICIPATION_NOTICE = "참여하고 여론을 확인하세요!";

/**
 * 홈 투표 띠의 자동 전환 간격(ms) (KAN-714). 실검 띠(`RotatingLine` 기본 4.5초)보다 빠르게 넘긴다.
 * 질문 한 줄이라 읽는 데 오래 걸리지 않고, 느리면 띠가 멈춘 것처럼 보인다.
 */
export const DEBATE_TICKER_INTERVAL_MS = 3000;

/**
 * 홈·VS 카드의 대표 의견 줄이 다음 의견으로 넘어가는 간격(ms) (KAN-714). 의견이 둘 이상일 때만 돈다.
 */
export const OPINION_TEASER_INTERVAL_MS = 3000;

/**
 * 대표 의견 줄이 넘기는 순서. 첫 줄(서버가 준 첫 의견)은 그대로 두고 나머지만 섞는다(KAN-724 PR).
 *
 * 홈 카드가 셋 나란히 서면 BE가 준 순서(최근 순)로 같은 박자에 넘어가 세 카드가 한 몸처럼 움직였다.
 * 카드마다 나머지 순서를 브라우저에서 무작위로 정해 제각각 돌게 한다. 첫 줄을 고정하는 건 서버 HTML과
 * 하이드레이션 첫 그림을 같게 두기 위해서다. 섞는 건 마운트 뒤다.
 *
 * @param count 의견 수
 * @param random 0 이상 1 미만의 난수. 테스트가 고정값을 넣는다
 * @returns 0으로 시작하는 인덱스 순열
 * @example shuffledTeaserOrder(4, () => 0) // [0, 1, 2, 3]
 */
export function shuffledTeaserOrder(
  count: number,
  random: () => number = Math.random,
): number[] {
  const rest = Array.from({ length: Math.max(0, count - 1) }, (_, i) => i + 1);
  for (let i = rest.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [rest[i], rest[j]] = [rest[j] as number, rest[i] as number];
  }
  return count > 0 ? [0, ...rest] : [];
}

/**
 * 대표 의견 줄의 첫 전환까지 기다리는 시간(ms). 간격의 절반에서 1.5배 사이를 카드마다 다르게 뽑아
 * 나란한 카드들이 같은 순간에 넘어가지 않게 한다. 그 뒤로는 간격대로 돈다.
 *
 * @param random 0 이상 1 미만의 난수. 테스트가 고정값을 넣는다
 */
export function teaserFirstDelayMs(random: () => number = Math.random): number {
  return Math.round(OPINION_TEASER_INTERVAL_MS * (0.5 + random()));
}

/** 실제 마감 시각으로 남은 시간을 분 단위로 표시한다. */
export function participationDeadline(
  closesAt: string,
  now: number,
): string | null {
  const remaining = new Date(closesAt).getTime() - now;
  if (!Number.isFinite(remaining)) return null;
  if (remaining <= 0) return "마감";
  const minutes = Math.ceil(remaining / 60_000);
  if (minutes < 60) return `${minutes}분 후 마감`;
  const hours = Math.ceil(minutes / 60);
  if (hours < 24) return `${hours}시간 후 마감`;
  return `${Math.ceil(hours / 24)}일 후 마감`;
}

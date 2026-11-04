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

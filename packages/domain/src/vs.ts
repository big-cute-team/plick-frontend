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

export const PARTICIPATION_NOTICE = "참여하고 여론을 확인하세요!";

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

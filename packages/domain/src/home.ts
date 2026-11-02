import { activeMatches, type MatchSummary } from "./live";

/** 라이브가 있으면 진행 중인 경기만, 없으면 예정 경기부터 오늘 일정을 보여준다. */
export function homeTickerMatches(matches: MatchSummary[]): MatchSummary[] {
  const today = activeMatches(matches);
  const live = today.filter((match) => match.status === "LIVE");
  return live.length
    ? live
    : [
        ...today.filter((match) => match.status === "SCHEDULED"),
        ...today.filter((match) => match.status !== "SCHEDULED"),
      ];
}

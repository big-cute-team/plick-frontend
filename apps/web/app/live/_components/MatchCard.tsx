import Link from "next/link";
import {
  matchStatusLabel,
  type MatchStatusTone,
  type MatchSummary,
} from "@plick/domain/live";
import { LiveCrest } from "./LiveCrest";

/** 상태 컬럼 첫 줄의 톤 → 색 토큰 매핑(모바일 카드와 같은 규약). */
const TONE_TEXT: Record<MatchStatusTone, string> = {
  live: "text-danger",
  scheduled: "text-text-2",
  finished: "text-text-3",
  postponed: "text-warn",
};

/**
 * 경기 목록 카드(피그마 LW1) — 모바일 L1 카드의 데스크톱판. 상태 컬럼·팀
 * 두 줄·스코어 컬럼 구성은 같고 hover·focus 상태만 데스크톱답게 더한다.
 */
export function MatchCard({ match }: { match: MatchSummary }) {
  const { primary, secondary, tone } = matchStatusLabel(match);

  return (
    <Link
      href={`/live/matches/${match.id}`}
      className="bg-elevate rounded-card hover:border-border-strong focus-visible:outline-accent flex items-center gap-4 border border-transparent px-4 py-3.5 transition-colors focus-visible:outline-2"
    >
      <span className="flex w-13 shrink-0 flex-col items-center gap-0.5">
        <span className={`text-body font-bold ${TONE_TEXT[tone]}`}>
          {primary}
        </span>
        <span className="text-micro text-text-4 font-medium">{secondary}</span>
      </span>
      <span aria-hidden className="bg-border h-9 w-px shrink-0" />
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <TeamLine match={match} side="home" />
        <TeamLine match={match} side="away" />
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <ScoreText match={match} side="home" />
        <ScoreText match={match} side="away" />
      </span>
    </Link>
  );
}

function TeamLine({
  match,
  side,
}: {
  match: MatchSummary;
  side: "home" | "away";
}) {
  const team = match[side];
  return (
    <span className="flex items-center gap-2">
      <LiveCrest team={team} size={20} />
      <span
        className={`text-body-lg truncate font-semibold ${team.code ? "text-text" : "text-text-3"}`}
      >
        {team.name}
      </span>
    </span>
  );
}

/** 스코어 색 규칙은 모바일과 동일 — 라이브 accent, 종료는 승리 쪽만 밝게. */
function ScoreText({
  match,
  side,
}: {
  match: MatchSummary;
  side: "home" | "away";
}) {
  const value = match.score[side];
  if (value === null) {
    return <span className="text-title text-text-4 font-bold">-</span>;
  }
  const other = match.score[side === "home" ? "away" : "home"] ?? 0;
  const color =
    match.status === "LIVE"
      ? "text-accent"
      : value >= other
        ? "text-text"
        : "text-text-3";
  return <span className={`text-title font-bold ${color}`}>{value}</span>;
}

import Link from "next/link";
import {
  matchStatusLabel,
  type MatchStatusTone,
  type MatchSummary,
} from "@plick/domain/live";
import { LiveCrest } from "./LiveCrest";

/** 상태 컬럼 첫 줄의 톤 → 색 토큰 매핑. */
const TONE_TEXT: Record<MatchStatusTone, string> = {
  live: "text-danger",
  scheduled: "text-text-2",
  finished: "text-text-3",
  postponed: "text-warn",
};

/**
 * 경기 목록 카드 — 상태 컬럼·팀 두 줄·스코어 컬럼 구성으로 4상태(라이브·예정·
 * 종료·연기)를 한 레이아웃이 소화한다(피그마 L1). 카드 전체가 상세로 가는
 * 링크다. 연기·취소 경기도 상세(헤더만 있는 지면)로 들어갈 수 있다.
 */
export function MatchCard({ match }: { match: MatchSummary }) {
  const { primary, secondary, tone } = matchStatusLabel(match);

  return (
    <Link
      href={`/live/matches/${match.id}`}
      className="bg-elevate rounded-card flex items-center gap-3 px-3 py-3.5 active:opacity-80"
    >
      <span className="flex w-12 shrink-0 flex-col items-center gap-0.5">
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

/** 팀 한 줄 — 빅6 밖 팀명은 디자인대로 낮춰 그린다. */
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

/**
 * 스코어 한 줄. 킥오프 전 null은 "-"(명세 규약), 라이브는 accent, 종료는
 * 승리 쪽만 밝게 남긴다(피그마 L1의 CHE 3 - 0 표기).
 */
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

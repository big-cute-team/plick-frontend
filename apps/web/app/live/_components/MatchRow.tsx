import Link from "next/link";
import {
  matchStatusLabel,
  type MatchStatusTone,
  type MatchSummary,
} from "@plick/domain/live";
import { LiveCrest } from "@plick/ui/LiveCrest";

/** 상태 칸 첫 줄의 톤 → 색 토큰(시안: 진행 중 빨강, 종료 회색, 예정 본문 보조색). */
const TONE_TEXT: Record<MatchStatusTone, string> = {
  live: "text-danger",
  scheduled: "text-text-2",
  finished: "text-text-4",
  postponed: "text-warn",
};

/**
 * 경기 목록 한 행 (KAN-462 카드 → KAN-567 시안 LIVE 759-780행). 상태 62px(13/700 +
 * 11 보조), 세로 구분선 40px, 팀 두 줄(엠블럼 24 + 이름 14.5/700), 스코어 두 줄
 * 18/900 오른쪽, 그리고 64px 칸에 진행 중이면 빨간 "LIVE". 행 전체가 상세 링크고
 * hover면 연한 면이 깔린다. 전에는 파일 이름이 `MatchCard`였다. 카드 면과 테두리가
 * 사라져 이름도 행으로 바꿨다.
 *
 * 시안의 64px 칸은 채팅 접속 수였는데 그 값이 API에 없어 LIVE 글자로 대신한다.
 */
export function MatchRow({ match }: { match: MatchSummary }) {
  const { primary, secondary, tone } = matchStatusLabel(match);

  return (
    <Link
      href={`/live/matches/${match.id}`}
      className="border-border-soft hover:bg-elevate-2 focus-visible:outline-accent flex items-center gap-3 border-b px-2 py-3.25 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 lg:gap-5"
    >
      <span className="flex w-15.5 shrink-0 flex-col items-center gap-0.5">
        <span className={`text-body font-bold ${TONE_TEXT[tone]}`}>
          {primary}
        </span>
        <span className="text-caption text-text-4">{secondary}</span>
      </span>
      <span aria-hidden className="bg-border h-10 w-px shrink-0" />
      <span className="flex min-w-0 flex-1 flex-col gap-2.25">
        <TeamLine team={match.home} />
        <TeamLine team={match.away} />
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <ScoreText match={match} side="home" />
        <ScoreText match={match} side="away" />
      </span>
      <span className="text-caption-lg text-danger tracking-live w-16 shrink-0 text-right font-bold max-lg:hidden">
        {match.status === "LIVE" ? "LIVE" : ""}
      </span>
    </Link>
  );
}

/** 팀 한 줄 — 엠블럼 24 + 전체 팀명. */
function TeamLine({ team }: { team: MatchSummary["home"] }) {
  return (
    <span className="flex items-center gap-2.5">
      <LiveCrest team={team} size={24} />
      <span className="text-hero-sm text-text-strong truncate font-bold">
        {team.name}
      </span>
    </span>
  );
}

/** 스코어 색 규칙 — 라이브 강조색, 종료는 이긴 쪽만 제목색, 킥오프 전은 "-". */
function ScoreText({
  match,
  side,
}: {
  match: MatchSummary;
  side: "home" | "away";
}) {
  const value = match.score[side];
  if (value === null) {
    return (
      <span className="text-reel text-text-4 leading-[1.1] font-black">-</span>
    );
  }
  const other = match.score[side === "home" ? "away" : "home"] ?? 0;
  const color =
    match.status === "LIVE"
      ? "text-accent"
      : value >= other
        ? "text-text-strong"
        : "text-text-4";
  return (
    <span className={`text-reel leading-[1.1] font-black ${color}`}>
      {value}
    </span>
  );
}

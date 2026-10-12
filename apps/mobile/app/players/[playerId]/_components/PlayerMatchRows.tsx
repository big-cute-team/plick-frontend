import {
  matchResultLabel,
  matchStatLine,
  type PlayerMatch,
} from "@plick/domain/player-profile";
import { dotDateLabel, profileRatingTone } from "@plick/domain/team-profile";
import { LiveCrest } from "@plick/ui/LiveCrest";
import { RATING_TONE_CLASS } from "@/_constants/profile";
import { TeamProfileLink } from "@/live/_components/TeamProfileLink";

/**
 * 선수 경기 행 목록 (KAN-604, 시안 선수 프로필 모바일 경기 행). 날짜 48, 상대 엠블럼 24,
 * 상대 이름 + 홈/원정, 아래 줄 "출전 분, 골, 도움, 슈팅, 패스"(결장이면 "결장"), 오른쪽에
 * 이 선수 팀 기준 결과 "승 2-1"(승만 강조색)과 평점이다. 상대가 빅6면 팀 프로필로 링크한다.
 * 개요의 최근 경기와 경기 탭이 같이 쓴다.
 *
 * @param matches 경기(최신순)
 */
export function PlayerMatchRows({ matches }: { matches: PlayerMatch[] }) {
  return (
    <div>
      {matches.map((match) => (
        <Row key={match.matchId} match={match} />
      ))}
    </div>
  );
}

function Row({ match }: { match: PlayerMatch }) {
  const recorded =
    match.participation === "STARTED" || match.participation === "SUB";
  const rating = recorded ? match.rating : null;
  const { opponent } = match;
  return (
    <div className="border-border-soft flex min-h-14.5 items-center gap-2.5 border-b py-2">
      <span
        className="text-label text-text-3 w-12 shrink-0 tabular-nums"
        title={match.competition}
      >
        {dotDateLabel(match.kickoffAt)}
      </span>
      <TeamProfileLink
        team={opponent}
        className="flex min-w-0 flex-1 items-center gap-2.5 active:opacity-70"
      >
        <LiveCrest team={opponent} size={24} />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex min-w-0 items-baseline gap-1.25">
            <span className="text-body-md text-text-strong truncate font-bold">
              {opponent.name}
            </span>
            <span className="text-caption text-text-4 shrink-0">
              {match.isHome ? "홈" : "원정"}
            </span>
          </span>
          <span className="text-caption text-text-3 truncate tabular-nums">
            {matchStatLine(match)}
          </span>
        </span>
      </TeamProfileLink>
      <span
        className={`text-label-lg shrink-0 font-bold tabular-nums ${match.result === "W" ? "text-accent" : "text-text-2"}`}
      >
        {matchResultLabel(match) ?? "-"}
      </span>
      <span
        className={`text-body-lg w-8 shrink-0 text-right font-black tabular-nums ${RATING_TONE_CLASS[profileRatingTone(rating)]}`}
      >
        {rating?.toFixed(1) ?? "-"}
      </span>
    </div>
  );
}

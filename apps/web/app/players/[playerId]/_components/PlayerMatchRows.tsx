import {
  matchResultLabel,
  type PlayerMatch,
} from "@plick/domain/player-profile";
import {
  playedDateLabel,
  profileRatingTone,
  roundLabel,
} from "@plick/domain/team-profile";
import { LiveCrest } from "@plick/ui/LiveCrest";
import { RATING_TONE_CLASS } from "@/_constants/profile";
import { TeamProfileLink } from "@/live/_components/TeamProfileLink";

/** 최근 경기 열 (시안 1531행: 날짜, 상대, 결과, 출전, 골, 도움, 평점). */
const BRIEF_COLS =
  "grid-cols-[4rem_minmax(0,1fr)_4rem_2.875rem_2.125rem_2.125rem_3.125rem]";

/** 경기 기록 열 (시안 1586행에 라운드를 앞에 더했다: 라운드 + 날짜 ... 슈팅, 패스, 평점). */
const FULL_COLS =
  "grid-cols-[2.5rem_4rem_minmax(0,1fr)_4rem_2.875rem_2.125rem_2.125rem_2.5rem_2.5rem_3.125rem]";

/**
 * 선수 경기 표 (KAN-600, 시안 선수 프로필 최근 경기 1529-1543행, 경기 기록 1584-1598행). 개요는
 * 짧은 열(brief), 경기 탭은 라운드와 슈팅, 패스를 더한 열(full)이다. 결과는 이 선수 팀 기준
 * "승 2-1"이고 승만 강조색이다. 결장(ABSENT)은 출전 칸에 "결장", 나머지 칸 "-"이고 기록 조회
 * 실패(UNKNOWN)는 숫자 칸이 다 "-"다. 상대가 빅6면 팀 프로필로 링크한다. 좁은 화면에서는 열을
 * 숨기지 않고 표만 가로로 넘긴다.
 *
 * @param matches 경기(최신순)
 * @param variant brief(개요) 또는 full(경기 탭)
 */
export function PlayerMatchRows({
  matches,
  variant,
}: {
  matches: PlayerMatch[];
  variant: "brief" | "full";
}) {
  const full = variant === "full";
  const cols = full ? FULL_COLS : BRIEF_COLS;
  const head = "text-center";
  return (
    <div className="overflow-x-auto">
      <div className={full ? "min-w-[38rem]" : "min-w-[28rem]"} role="table">
        <div
          role="row"
          className={`border-border-table text-micro-lg text-text-4 grid h-7 items-center gap-2 border-b ${cols}`}
        >
          {full && <span>라운드</span>}
          <span>날짜</span>
          <span>상대</span>
          <span className={head}>결과</span>
          <span className={head}>출전</span>
          <span className={head}>골</span>
          <span className={head}>도움</span>
          {full && <span className={head}>슈팅</span>}
          {full && <span className={head}>패스</span>}
          <span className={head}>평점</span>
        </div>
        {matches.map((match) => (
          <Row key={match.matchId} match={match} full={full} cols={cols} />
        ))}
      </div>
    </div>
  );
}

function Row({
  match,
  full,
  cols,
}: {
  match: PlayerMatch;
  full: boolean;
  cols: string;
}) {
  const recorded =
    match.participation === "STARTED" || match.participation === "SUB";
  const value = (v: number | null) => (recorded && v !== null ? v : "-");
  const minutes =
    match.participation === "ABSENT"
      ? "결장"
      : recorded && match.minutes !== null
        ? `${match.minutes}'`
        : "-";
  const rating = recorded ? match.rating : null;
  const cell = "text-label text-text-3 text-center tabular-nums";
  const { opponent } = match;

  return (
    <div
      role="row"
      className={`border-border-soft grid h-10 items-center gap-2 border-b ${cols}`}
    >
      {full && (
        <span className="text-label text-text-4 tabular-nums">
          {roundLabel(match.round)}
        </span>
      )}
      <span
        className="text-label text-text-3 tabular-nums"
        title={match.competition}
      >
        {playedDateLabel(match.kickoffAt)}
      </span>
      <span className="flex min-w-0 items-center gap-1.75">
        <TeamProfileLink
          team={opponent}
          className="group focus-visible:outline-accent flex min-w-0 items-center gap-1.75 focus-visible:outline-2"
        >
          <LiveCrest team={opponent} size={18} />
          <span
            className={`text-label-lg text-text-strong truncate font-bold ${opponent.code ? "group-hover:text-accent" : ""}`}
          >
            {opponent.name}
          </span>
        </TeamProfileLink>
        <span className="text-caption text-text-4 shrink-0">
          {match.isHome ? "홈" : "원정"}
        </span>
      </span>
      <span
        className={`text-label-lg text-center font-bold tabular-nums ${match.result === "W" ? "text-accent" : "text-text-3"}`}
      >
        {matchResultLabel(match) ?? "-"}
      </span>
      <span className={cell}>{minutes}</span>
      <span className={cell}>{value(match.goals)}</span>
      <span className={cell}>{value(match.assists)}</span>
      {full && <span className={cell}>{value(match.shots)}</span>}
      {full && <span className={cell}>{value(match.passes)}</span>}
      <span
        className={`text-label-lg text-center font-black tabular-nums ${RATING_TONE_CLASS[profileRatingTone(rating)]}`}
      >
        {rating?.toFixed(1) ?? "-"}
      </span>
    </div>
  );
}

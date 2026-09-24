import { LIVE_SEASON_LABEL, type StandingRow } from "@plick/domain/live";
import { LiveCrest } from "@plick/ui/LiveCrest";
import { TeamProfileLink } from "./TeamProfileLink";

/** 순위표 열 그리드 (시안 LIVE 789행). 우측 aside 340px 안에 여덟 열을 맞춘 값이다. */
const COLS = "grid-cols-[20px_22px_minmax(0,1fr)_24px_24px_24px_30px_30px]";

/**
 * LIVE 우측의 순위표 (KAN-452 → KAN-567 시안 LIVE 784-815행). 머리 "순위표" 14/900 +
 * "2026-27 시즌", 열 머리 10.5 보조색에 표 테두리, 행 29px에 목록 구분선. 순위
 * 11.5/700이고 1~4위(챔스권)는 강조색, 엠블럼 18, 팀 12.5(빅6는 700), 숫자 11.5
 * 보조색, 승점 12.5/900. 아래 범례는 2px 강조색 막대 + "1~4위 챔피언스리그"다.
 * 빅6 행은 팀 프로필 링크다. 시안의 무 열은 aside 폭에 안 들어가 경기, 승, 패,
 * 득실, 승점만 둔다.
 */
export function StandingsRail({ rows }: { rows: StandingRow[] }) {
  return (
    <section aria-label="순위표">
      <div className="flex items-baseline justify-between pb-2.5">
        <h2 className="text-body-md text-text-strong font-black">순위표</h2>
        <span className="text-caption-lg text-text-3">
          {LIVE_SEASON_LABEL} 시즌
        </span>
      </div>
      <div
        className={`border-border-table text-micro-lg text-text-4 grid h-6.5 items-center gap-1.5 border-b ${COLS}`}
      >
        <span className="text-center">#</span>
        <span />
        <span>팀</span>
        <span className="text-center">경기</span>
        <span className="text-center">승</span>
        <span className="text-center">패</span>
        <span className="text-center">득실</span>
        <span className="text-center">승점</span>
      </div>
      {rows.map((row) => (
        <StandingLine key={row.rank} row={row} />
      ))}
      <p className="text-caption-lg text-text-3 flex items-center gap-1.75 pt-2.75">
        <span aria-hidden className="bg-accent h-2.75 w-0.5" />
        1~4위 챔피언스리그
      </p>
    </section>
  );
}

function StandingLine({ row }: { row: StandingRow }) {
  /* 옛 `/live/teams/{id}`는 팀 프로필로 308이지만(KAN-507), 링크는 도착지를
     직접 가리킨다. 리다이렉트 한 번을 아끼고 prefetch도 실제 화면에 걸린다 */
  return (
    <TeamProfileLink
      team={row.team}
      className={`border-border-soft hover:bg-elevate-2 focus-visible:outline-accent grid h-7.25 items-center gap-1.5 border-b transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 ${COLS}`}
    >
      <span
        className={`text-caption-lg text-center font-bold ${
          row.zone === "UCL" ? "text-accent" : "text-text-3"
        }`}
      >
        {row.rank}
      </span>
      <span className="flex justify-center">
        <LiveCrest team={row.team} size={18} />
      </span>
      <span
        className={`text-label-lg text-text-strong min-w-0 truncate ${row.team.code ? "font-bold" : ""}`}
      >
        {row.team.name}
      </span>
      <span className="text-caption-lg text-text-3 text-center">
        {row.played}
      </span>
      <span className="text-caption-lg text-text-3 text-center">{row.win}</span>
      <span className="text-caption-lg text-text-3 text-center">
        {row.lose}
      </span>
      <span className="text-caption-lg text-text-3 text-center">
        {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
      </span>
      <span className="text-label-lg text-text-strong text-center font-black">
        {row.points}
      </span>
    </TeamProfileLink>
  );
}

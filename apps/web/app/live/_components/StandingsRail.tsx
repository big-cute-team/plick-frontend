import Link from "next/link";
import { LIVE_SEASON_LABEL, type StandingRow } from "@plick/domain/live";
import { LiveCrest } from "./LiveCrest";

/**
 * 대시보드 우측의 순위표 카드(피그마 LW1 우측 레일). 데스크톱은 순위를 별도
 * 라우트로 빼지 않고 목록 옆에 항상 노출한다 — 챔스권(1~4위) accent 랭크,
 * 마이팀(껍데기에선 리버풀 고정) 행 하이라이트, 빅6 행은 스쿼드 링크.
 * lg 아래에선 목록 아래로 스택된다(숨기지 않는다).
 */
export function StandingsRail({ rows }: { rows: StandingRow[] }) {
  return (
    <section className="bg-elevate rounded-card h-fit px-3.5 py-4">
      <div className="flex items-baseline justify-between px-1 pb-2">
        <h2 className="text-body-lg text-text font-bold">순위표</h2>
        <span className="text-caption text-text-4">
          {LIVE_SEASON_LABEL} 시즌
        </span>
      </div>
      {rows.map((row) => (
        <StandingLine key={row.rank} row={row} />
      ))}
      <p className="text-caption text-text-4 flex items-center gap-1.5 px-1 pt-3">
        <span aria-hidden className="bg-accent h-2.5 w-0.5 rounded-full" />
        1~4위 챔피언스리그 · 1시간마다 갱신돼요
      </p>
    </section>
  );
}

function StandingLine({ row }: { row: StandingRow }) {
  /* 껍데기 단계의 마이팀 강조는 리버풀 고정 — 실배선 때 프로필 마이팀으로 */
  const myTeam = row.team.code === "LIV";
  const content = (
    <>
      <span
        className={`text-caption w-4 shrink-0 text-center font-semibold ${
          row.zone === "UCL" ? "text-accent" : "text-text-4"
        }`}
      >
        {row.rank}
      </span>
      <LiveCrest team={row.team} size={18} />
      <span
        className={`text-label min-w-0 flex-1 truncate ${
          row.team.code ? "text-text font-semibold" : "text-text-3"
        }`}
      >
        {row.team.name}
      </span>
      <span
        className={`text-label shrink-0 font-bold ${myTeam ? "text-accent" : "text-text-2"}`}
      >
        {row.points}
      </span>
    </>
  );

  const lineClass = `flex items-center gap-2 rounded-tile px-1.5 py-1.5 ${
    myTeam ? "bg-accent-tint" : ""
  }`;

  if (row.team.id === null) {
    return <div className={lineClass}>{content}</div>;
  }
  return (
    <Link
      href={`/live/teams/${row.team.id}`}
      className={`${lineClass} hover:bg-elevate-2 focus-visible:outline-accent transition-colors focus-visible:outline-2`}
    >
      {content}
    </Link>
  );
}

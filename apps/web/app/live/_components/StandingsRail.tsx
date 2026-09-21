import { LIVE_SEASON_LABEL, type StandingRow } from "@plick/domain/live";
import { LiveCrest } from "@plick/ui/LiveCrest";
import { TeamProfileLink } from "./TeamProfileLink";

/**
 * 대시보드 우측의 순위표 카드(피그마 LW1 우측 레일). 데스크톱은 순위를 별도
 * 라우트로 빼지 않고 목록 옆에 항상 노출한다 — 챔스권(1~4위) accent 랭크,
 * 빅6 행은 팀 링크. lg 아래에선 목록 아래로 스택된다(숨기지 않는다).
 *
 * 껍데기 때 리버풀 행에 박아 둔 마이팀 하이라이트는 걷어냈다(모바일 순위표와
 * 같은 판단) — 근거 없이 한 팀만 선택된 것처럼 보였다.
 */
export function StandingsRail({ rows }: { rows: StandingRow[] }) {
  return (
    <section className="bg-elevate rounded-card h-fit px-4 py-5">
      <div className="flex items-baseline justify-between px-1 pb-3">
        <h2 className="text-title text-text font-bold">순위표</h2>
        <span className="text-body text-text-4">{LIVE_SEASON_LABEL} 시즌</span>
      </div>
      {rows.map((row) => (
        <StandingLine key={row.rank} row={row} />
      ))}
      <p className="text-body text-text-4 flex items-center gap-1.5 px-1 pt-4">
        <span aria-hidden className="bg-accent h-3 w-0.5 rounded-full" />
        1~4위 챔피언스리그
      </p>
    </section>
  );
}

function StandingLine({ row }: { row: StandingRow }) {
  const content = (
    <>
      <span
        className={`text-body w-5 shrink-0 text-center font-semibold ${
          row.zone === "UCL" ? "text-accent" : "text-text-4"
        }`}
      >
        {row.rank}
      </span>
      <LiveCrest team={row.team} size={24} />
      <span
        className={`text-body-lg min-w-0 flex-1 truncate ${
          row.team.code ? "text-text font-semibold" : "text-text-3"
        }`}
      >
        {row.team.name}
      </span>
      <span className="text-body-lg text-text-2 shrink-0 font-bold">
        {row.points}
      </span>
    </>
  );

  /* 옛 `/live/teams/{id}`는 팀 프로필로 308이지만(KAN-507), 링크는 도착지를
     직접 가리킨다 — 리다이렉트 한 번을 아끼고 prefetch도 실제 화면에 걸린다 */
  return (
    <TeamProfileLink
      team={row.team}
      className="rounded-tile hover:bg-elevate-2 focus-visible:outline-accent flex items-center gap-2.5 px-2 py-2 transition-colors focus-visible:outline-2"
    >
      {content}
    </TeamProfileLink>
  );
}

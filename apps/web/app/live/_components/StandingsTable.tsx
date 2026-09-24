import type { MatchSummary, StandingRow } from "@plick/domain/live";
import { LiveCrest } from "@plick/ui/LiveCrest";
import { TeamProfileLink } from "./TeamProfileLink";

/** 순위 탭 열 그리드 (시안 경기 상세 987행). 본문 폭이라 무 열까지 아홉 열이다. */
const COLS =
  "grid-cols-[24px_24px_minmax(0,1fr)_34px_34px_34px_34px_40px_40px]";

/**
 * 경기 상세 순위 탭의 리그 표 (KAN-567 시안 경기 상세 985-1010행). LIVE 목록의
 * 순위표 aside와 같은 규칙(챔스권 강조색, 빅6 700, 승점 900)인데 본문 폭이라 무 열이
 * 있고 행이 32px로 조금 높다. 이 경기의 두 팀 행은 연한 면으로 표시한다.
 *
 * @param rows 20팀 순위
 * @param header 지금 경기. 두 팀 행을 강조한다
 */
export function StandingsTable({
  rows,
  header,
}: {
  rows: StandingRow[];
  header: MatchSummary;
}) {
  const involved = new Set(
    [header.home.id, header.away.id].filter((id) => id !== null),
  );
  return (
    <div className="pt-4.5">
      <div
        className={`border-border-table text-micro-lg text-text-4 grid h-7 items-center gap-2 border-b ${COLS}`}
      >
        <span className="text-center">#</span>
        <span />
        <span>팀</span>
        <span className="text-center">경기</span>
        <span className="text-center">승</span>
        <span className="text-center">무</span>
        <span className="text-center">패</span>
        <span className="text-center">득실</span>
        <span className="text-center">승점</span>
      </div>
      {rows.map((row) => (
        <TeamProfileLink
          key={row.rank}
          team={row.team}
          className={`border-border-soft hover:bg-elevate-2 focus-visible:outline-accent grid h-8 items-center gap-2 border-b transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 ${COLS} ${
            row.team.id !== null && involved.has(row.team.id)
              ? "bg-elevate"
              : ""
          }`}
        >
          <span
            className={`text-label text-center font-bold ${
              row.zone === "UCL" ? "text-accent" : "text-text-3"
            }`}
          >
            {row.rank}
          </span>
          <span className="flex justify-center">
            <LiveCrest team={row.team} size={18} />
          </span>
          <span
            className={`text-body text-text-strong min-w-0 truncate ${row.team.code ? "font-bold" : ""}`}
          >
            {row.team.name}
          </span>
          <span className="text-label text-text-3 text-center">
            {row.played}
          </span>
          <span className="text-label text-text-3 text-center">{row.win}</span>
          <span className="text-label text-text-3 text-center">{row.draw}</span>
          <span className="text-label text-text-3 text-center">{row.lose}</span>
          <span className="text-label text-text-3 text-center">
            {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
          </span>
          <span className="text-body text-text-strong text-center font-black">
            {row.points}
          </span>
        </TeamProfileLink>
      ))}
    </div>
  );
}

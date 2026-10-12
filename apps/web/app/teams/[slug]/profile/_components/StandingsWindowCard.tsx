import type { StandingRow } from "@plick/domain/live";
import { goalDiffLabel } from "@plick/domain/team-profile";
import { LiveCrest } from "@plick/ui/LiveCrest";
import { LiveLoadError } from "@/live/_components/LiveLoadError";
import { TeamProfileLink } from "@/live/_components/TeamProfileLink";
import { RailCard } from "@/_components/RailCard";

/** 순위 5팀 열 (시안 1424행: #, 팀, 경기, 득실, 승점). */
const COLS = "grid-cols-[1.25rem_minmax(0,1fr)_1.875rem_2.125rem_1.875rem]";

/**
 * 레일 "프리미어리그 순위" (KAN-599, 시안 팀 프로필 1419-1434행). 순위표에서 이 팀 앞뒤
 * 5행을 잘라(`standingsWindow`) 이 팀 행만 `accent-tint` 면과 900으로 강조한다. 빅6 행은
 * 팀 프로필 링크다.
 *
 * @param rows 잘라 낸 순위 행. null이면 순위표를 못 받은 것
 * @param teamId 강조할 이 팀 id
 */
export function StandingsWindowCard({
  rows,
  teamId,
}: {
  rows: StandingRow[] | null;
  teamId: number;
}) {
  return (
    <RailCard title="프리미어리그 순위">
      {rows === null ? (
        <LiveLoadError compact />
      ) : rows.length === 0 ? (
        <p className="text-label text-text-4 px-3.5 py-6">순위가 아직 없어요</p>
      ) : (
        <div className="px-3.5 pt-1 pb-2">
          <div
            className={`text-micro-lg text-text-4 grid h-6.5 items-center gap-2 ${COLS}`}
          >
            <span>#</span>
            <span>팀</span>
            <span className="text-center">경기</span>
            <span className="text-center">득실</span>
            <span className="text-center">승점</span>
          </div>
          {rows.map((row) => {
            const self = row.team.id === teamId;
            return (
              <TeamProfileLink
                key={row.rank}
                team={row.team}
                className={`focus-visible:outline-accent -mx-3.5 grid h-8.5 items-center gap-2 px-3.5 focus-visible:outline-2 focus-visible:-outline-offset-2 ${COLS} ${self ? "bg-accent/8" : row.team.code ? "hover:bg-elevate-2" : ""}`}
              >
                <span className="text-label text-text-3 font-bold tabular-nums">
                  {row.rank}
                </span>
                <span className="flex min-w-0 items-center gap-1.75">
                  <LiveCrest team={row.team} size={18} />
                  <span
                    className={`text-body text-text-strong truncate ${self ? "font-black" : "font-bold"}`}
                  >
                    {row.team.name}
                  </span>
                </span>
                <span className="text-label text-text-3 text-center tabular-nums">
                  {row.played}
                </span>
                <span className="text-label text-text-3 text-center tabular-nums">
                  {goalDiffLabel(row.goalDiff)}
                </span>
                <span className="text-label-lg text-text-strong text-center font-black tabular-nums">
                  {row.points}
                </span>
              </TeamProfileLink>
            );
          })}
        </div>
      )}
    </RailCard>
  );
}

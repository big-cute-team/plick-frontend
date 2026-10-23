import { goalDiffLabel } from "@plick/domain/team-profile";
import type { StandingRow } from "@plick/domain/live";
import { LiveCrest } from "@plick/ui/LiveCrest";
import { TeamProfileLink } from "@/live/_components/TeamProfileLink";

/** 순위 행 열 (시안: #, 팀, 경기, 득실, 승점). */
const COLS = "grid-cols-[1.75rem_minmax(0,1fr)_2.25rem_2.25rem_2.25rem]";

/**
 * 개요 "리그 순위" 5팀 (KAN-604, 시안 팀 프로필 모바일). 이 팀 앞뒤로 자른 순위표
 * (`standingsWindow`)를 행 40에 깔고 이 팀 행만 옅은 강조색 면 radius 10으로 띄운다.
 * 빅6 팀은 팀 프로필로 링크한다.
 *
 * @param rows 자른 순위표 5행
 * @param teamId 이 팀 BE id
 */
export function StandingsWindow({
  rows,
  teamId,
}: {
  rows: StandingRow[];
  teamId: number;
}) {
  const cell = "text-label text-text-3 text-center tabular-nums";
  return (
    <div role="table">
      <div
        role="row"
        className={`text-micro-lg text-text-4 grid h-7 items-center px-2 ${COLS}`}
      >
        {/* role="table" 아래 행은 셀 역할을 채워야 표로 읽힌다 (aria-required-children, KAN-670) */}
        <span role="columnheader" aria-label="순위">
          #
        </span>
        <span role="columnheader">팀</span>
        <span role="columnheader" className="text-center">
          경기
        </span>
        <span role="columnheader" className="text-center">
          득실
        </span>
        <span role="columnheader" className="text-center">
          승점
        </span>
      </div>
      {rows.map((row) => {
        const self = row.team.id === teamId;
        return (
          <div
            key={row.rank}
            role="row"
            className={`grid h-10 items-center px-2 ${COLS} ${self ? "bg-accent/8 rounded-tile" : ""}`}
          >
            <span role="cell" className="text-label text-text-3 tabular-nums">
              {row.rank}
            </span>
            {/* 링크에 셀 역할을 얹으면 링크 역할이 사라져 셀로 한 겹 감싼다 */}
            <span role="cell" className="min-w-0">
              <TeamProfileLink
                team={row.team}
                className="flex min-w-0 items-center gap-2 active:opacity-70"
              >
                <LiveCrest team={row.team} size={20} decorative />
                <span className="text-body text-text-strong truncate font-bold">
                  {row.team.name}
                </span>
              </TeamProfileLink>
            </span>
            <span role="cell" className={cell}>
              {row.played}
            </span>
            <span role="cell" className={cell}>
              {goalDiffLabel(row.goalDiff)}
            </span>
            <span
              role="cell"
              className="text-body text-text-strong text-center font-black tabular-nums"
            >
              {row.points}
            </span>
          </div>
        );
      })}
    </div>
  );
}

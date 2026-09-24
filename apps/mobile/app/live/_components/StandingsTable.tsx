import type { ReactNode } from "react";
import { LIVE_SEASON_LABEL, type StandingRow } from "@plick/domain/live";
import { LiveCrest } from "@plick/ui/LiveCrest";
import { TeamProfileLink } from "./TeamProfileLink";

/**
 * 순위표 (시안 KAN-567). 표 머리 28px 아래 20행 32px. 칸은 순위, 엠블럼 18,
 * 팀명, 경기, 승, (무), 패, 득실, 승점이다. 1~4위 순위 숫자는 강조색이고 빅6는
 * 팀명을 진하게(700), 나머지는 본문색 500이다. 행 전체가 팀 프로필 링크인데
 * 빅6 밖 팀은 프로필이 없어 `TeamProfileLink`가 글자로만 남긴다.
 *
 * 목록 화면(제목 "순위표", 시즌 라벨, 아래 챔피언스리그 범례)과 경기 상세의 순위
 * 탭(제목·범례 없이 무 열이 더 있다), `/live/standings`가 같이 쓴다. 시안의 두
 * 표가 열 구성이 달라 `showDraw`로 가른다.
 *
 * 전에는 채운 면 카드 안에 넣고 챔스권을 순위 옆 막대로 표시했다. 시안은 면 없이
 * 선으로만 나누고 순위 색으로 구분한다. 마이팀 강조는 실데이터가 붙은 뒤 걷어냈고
 * (근거 없는 한 팀 하이라이트), 프로필 응원팀을 읽으려면 세션이 필요해 따로 본다.
 *
 * @param rows 순위표 20행
 * @param title 표 위 제목. 없으면 시즌 라벨만 오른쪽에 둔다
 * @param legend "1~4위 챔피언스리그" 범례를 아래 그릴지
 * @param showDraw 무승부 열을 넣을지(경기 상세 순위 탭)
 * @param highlight 옅게 칠할 팀의 `shortName`(경기 상세에서 양 팀)
 */
export function StandingsTable({
  rows,
  title,
  legend = false,
  showDraw = false,
  highlight = [],
}: {
  rows: StandingRow[];
  title?: string;
  legend?: boolean;
  showDraw?: boolean;
  highlight?: string[];
}) {
  const cols = showDraw
    ? "grid-cols-[20px_20px_minmax(0,1fr)_26px_26px_26px_26px_32px_32px]"
    : "grid-cols-[20px_20px_minmax(0,1fr)_26px_26px_26px_32px_32px]";

  return (
    <div>
      <div className="flex items-baseline pb-2">
        {title && (
          <h2 className="text-body-lg text-text-strong tracking-section font-black">
            {title}
          </h2>
        )}
        <span className="flex-1" />
        <span className="text-caption-lg text-text-3">
          {LIVE_SEASON_LABEL} 시즌
        </span>
      </div>
      <div
        className={`border-border-table text-micro-lg text-text-4 grid h-7 items-center gap-1.5 border-b ${cols}`}
      >
        <span className="text-center">#</span>
        <span />
        <span>팀</span>
        <span className="text-center">경기</span>
        <span className="text-center">승</span>
        {showDraw && <span className="text-center">무</span>}
        <span className="text-center">패</span>
        <span className="text-center">득실</span>
        <span className="text-center">승점</span>
      </div>
      {rows.map((row) => (
        <TeamProfileLink
          key={row.rank}
          team={row.team}
          className={`border-border-soft grid h-8 items-center gap-1.5 border-b active:opacity-70 ${cols} ${
            highlight.includes(row.team.shortName) ? "bg-elevate-2" : ""
          }`}
        >
          <span
            className={`text-caption-lg text-center font-bold ${
              row.zone === "UCL" ? "text-accent" : "text-text-4"
            }`}
          >
            {row.rank}
          </span>
          <span className="flex justify-center">
            <LiveCrest team={row.team} size={18} />
          </span>
          <span
            className={`text-label-lg min-w-0 truncate ${
              row.team.code
                ? "text-text-strong font-bold"
                : "text-text font-medium"
            }`}
          >
            {row.team.name}
          </span>
          <Num>{row.played}</Num>
          <Num>{row.win}</Num>
          {showDraw && <Num>{row.draw}</Num>}
          <Num>{row.lose}</Num>
          <Num>{row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}</Num>
          <span className="text-label-lg text-text-strong text-center font-black">
            {row.points}
          </span>
        </TeamProfileLink>
      ))}
      {legend && (
        <p className="flex items-center gap-1.75 pt-2.75">
          <span aria-hidden className="bg-accent h-2.75 w-0.5" />
          <span className="text-caption-lg text-text-3">
            1~4위 챔피언스리그
          </span>
        </p>
      )}
    </div>
  );
}

/** 숫자 칸. 11.5 보조색 가운데 정렬 */
function Num({ children }: { children: ReactNode }) {
  return (
    <span className="text-caption-lg text-text-3 text-center">{children}</span>
  );
}

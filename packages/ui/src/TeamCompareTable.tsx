import type { LiveTeam } from "@plick/domain/live";
import {
  TEAM_COMPARE_NO_RANK,
  TEAM_FORM_LABEL,
  type TeamCompare,
  type TeamCompareRow,
} from "@plick/domain/prediction";
import { LiveCrest } from "./LiveCrest";

/**
 * 프리뷰 팀 비교 표 (KAN-699, 시안 가이드 §5.3). 3열(홈 값, 항목, 원정 값)이고 행은 40px다. 머리
 * 줄은 엠블럼과 팀명, 둘째 줄은 최근 5경기 칩(승 초록, 무 회색, 패 연회색에 글자도 함께), 그 아래
 * 리그 순위, 승률, 평균 득점, 평균 실점, 맞대결이다. 나은 쪽은 900에 제목색, 나머지는 500에 보조색이다.
 * 값이 없는 칸은 `-`, 순위가 없는 팀은 `리그 순위 없음`이다.
 *
 * 어느 쪽이 나은지는 도메인(`buildTeamCompare`)이 정해 오고 여기는 그리기만 한다. 앱과 웹이 같은 자리에
 * 같은 모양을 그려 처음부터 공용이다(ADR 0011). 모서리는 토큰이라 웹에서 각지고, 가운데 열 폭과 머리 줄
 * 선 색만 `size`로 가른다.
 *
 * @param home 홈 팀
 * @param away 원정 팀
 * @param compare 비교 표 데이터
 * @param size `sm`은 앱(가운데 96px), `lg`는 웹 경기 상세(110px)
 */
export function TeamCompareTable({
  home,
  away,
  compare,
  size = "sm",
  className = "",
}: {
  home: LiveTeam;
  away: LiveTeam;
  compare: TeamCompare;
  size?: "sm" | "lg";
  className?: string;
}) {
  const cols =
    size === "lg"
      ? "grid-cols-[minmax(0,1fr)_6.875rem_minmax(0,1fr)]"
      : "grid-cols-[minmax(0,1fr)_6rem_minmax(0,1fr)]";
  const rowClass = `grid ${cols} items-center`;

  return (
    <div role="table" aria-label="팀 비교" className={className}>
      <div
        role="row"
        className={`${rowClass} h-10 border-b ${
          size === "lg" ? "border-border-table" : "border-border"
        }`}
      >
        <TeamHead team={home} />
        <span role="columnheader" aria-label="항목" />
        <TeamHead team={away} />
      </div>
      <div
        role="row"
        className={`${rowClass} border-border-soft h-11 border-b`}
      >
        <FormChips results={compare.homeRecent} />
        <span role="rowheader" className="text-label text-text-3 text-center">
          최근 5경기
        </span>
        <FormChips results={compare.awayRecent} />
      </div>
      {compare.rows.map((row) => (
        <div
          key={row.key}
          role="row"
          className={`${rowClass} border-border-soft h-10 border-b`}
        >
          <Value row={row} side="home" />
          <span role="rowheader" className="text-label text-text-3 text-center">
            {row.label}
          </span>
          <Value row={row} side="away" />
        </div>
      ))}
    </div>
  );
}

function TeamHead({ team }: { team: LiveTeam }) {
  return (
    <span
      role="columnheader"
      className="flex min-w-0 items-center justify-center gap-1.5"
    >
      <LiveCrest team={team} size={20} decorative />
      <span className="text-body text-text-strong truncate font-bold">
        {team.name}
      </span>
    </span>
  );
}

/** 승무패 칩 한 줄. 색만으로 가르지 않게 글자(승, 무, 패)가 같이 들어간다. 집계가 없으면 `-`. */
function FormChips({ results }: { results: ("W" | "D" | "L")[] }) {
  if (results.length === 0) {
    return (
      <span role="cell" className="text-body-md text-text-4 text-center">
        -
      </span>
    );
  }
  return (
    <span role="cell" className="flex justify-center gap-0.75">
      {results.map((result, i) => (
        <span
          key={i}
          className={`rounded-badge text-caption grid size-5 place-items-center font-bold ${FORM_TONE[result]}`}
        >
          {TEAM_FORM_LABEL[result]}
        </span>
      ))}
    </span>
  );
}

function Value({ row, side }: { row: TeamCompareRow; side: "home" | "away" }) {
  const value = row[side];
  if (value === null) {
    return (
      <span role="cell" className="text-body-md text-text-4 text-center">
        -
      </span>
    );
  }
  if (value === TEAM_COMPARE_NO_RANK) {
    return (
      <span role="cell" className="text-caption text-text-4 text-center">
        {value}
      </span>
    );
  }
  return (
    <span
      role="cell"
      className={`text-body-md text-center tabular-nums ${
        row.better === side
          ? "text-text-strong font-black"
          : "text-text-3 font-medium"
      }`}
    >
      {value}
    </span>
  );
}

/**
 * 칩 색(시안 가이드 §5.3). 승 초록에 흰 글자, 무 회색 면, 패 연회색 면. 토큰 유틸 조합은 이 컴포넌트의
 * 그리기 규칙이라 `PredictionBar`의 `SEGMENT_TONE`처럼 여기 둔다. 글자(승, 무, 패)는 카피라 도메인에 있다.
 */
const FORM_TONE: Record<"W" | "D" | "L", string> = {
  W: "bg-accent text-on-accent",
  D: "bg-border-strong text-text-2",
  L: "bg-chip text-text-4",
};

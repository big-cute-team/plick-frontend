import type { StandingRow } from "@plick/domain/live";
import { LiveCrest } from "@plick/ui/LiveCrest";
import { TeamProfileLink } from "./TeamProfileLink";

/** 순위표 숫자 컬럼 정의 — 헤더와 행이 같은 폭을 쓴다. */
const NUM_COLS = "w-7 text-center";

/**
 * 순위표(피그마 L3). 챔스권(1~4위)은 랭크 옆 악센트 바, 빅6 행은 밝은 팀명과
 * 팀 링크로 구분한다. 빅6 밖 팀은 `team.code`가 없어 링크 없이 그린다.
 *
 * 껍데기 때는 리버풀 행을 마이팀으로 못박아 하이라이트했는데, 실데이터가 붙은
 * 뒤로는 아무 근거 없이 한 팀만 선택된 것처럼 보여서 걷어냈다. 프로필 응원팀을
 * 읽어 진짜 마이팀을 칠하려면 이 서버 컴포넌트가 세션을 봐야 해서 따로 본다.
 */
export function StandingsTable({ rows }: { rows: StandingRow[] }) {
  return (
    <div className="px-edge pt-3 pb-4">
      <div className="bg-elevate rounded-card px-3 py-2">
        <div className="border-border text-caption text-text-4 flex items-center gap-2 border-b px-1 py-2 font-medium">
          <span className="w-5 text-center">#</span>
          <span className="min-w-0 flex-1">팀</span>
          <span className={NUM_COLS}>경기</span>
          <span className="w-5 text-center">승</span>
          <span className="w-5 text-center">무</span>
          <span className="w-5 text-center">패</span>
          <span className={NUM_COLS}>득실</span>
          <span className={NUM_COLS}>승점</span>
        </div>
        {rows.map((row) => (
          <StandingLine key={row.rank} row={row} />
        ))}
        <p className="text-caption text-text-4 flex items-center gap-1.5 px-1 pt-2.5 pb-1.5">
          <span aria-hidden className="bg-accent h-2.5 w-0.5 rounded-full" />
          챔피언스리그 진출권 · 순위는 1시간마다 갱신돼요
        </p>
      </div>
    </div>
  );
}

function StandingLine({ row }: { row: StandingRow }) {
  const content = (
    <>
      <span className="relative w-5 text-center">
        {row.zone === "UCL" && (
          <span
            aria-hidden
            className="bg-accent absolute top-1/2 -left-2.5 h-3.5 w-0.5 -translate-y-1/2 rounded-full"
          />
        )}
        <span
          className={`text-label font-semibold ${row.zone === "UCL" ? "text-accent" : "text-text-4"}`}
        >
          {row.rank}
        </span>
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <LiveCrest team={row.team} size={18} />
        <span
          className={`text-label truncate ${row.team.code ? "text-text font-semibold" : "text-text-3"}`}
        >
          {row.team.name}
        </span>
      </span>
      <span className={`text-label text-text-3 ${NUM_COLS}`}>{row.played}</span>
      <span className="text-label text-text-3 w-5 text-center">{row.win}</span>
      <span className="text-label text-text-3 w-5 text-center">{row.draw}</span>
      <span className="text-label text-text-3 w-5 text-center">{row.lose}</span>
      <span className={`text-label text-text-3 ${NUM_COLS}`}>
        {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
      </span>
      <span className={`text-label text-text font-bold ${NUM_COLS}`}>
        {row.points}
      </span>
    </>
  );

  /* 옛 `/live/teams/{id}`는 팀 프로필로 308이지만(KAN-507), 링크는 도착지를
     직접 가리킨다 — 리다이렉트 한 번을 아끼고 prefetch도 실제 화면에 걸린다 */
  return (
    <TeamProfileLink
      team={row.team}
      className="flex items-center gap-2 px-1 py-2 active:opacity-80"
    >
      {content}
    </TeamProfileLink>
  );
}

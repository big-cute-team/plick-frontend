import Link from "next/link";
import { LIVE_SEASON_LABEL, type StandingRow } from "@plick/domain/live";
import { ChevronMiniIcon } from "@plick/ui/icons";

/**
 * 팀 프로필의 리그 순위 요약 (KAN-514) — 순위·승점·전적·득실을 한 줄로 얹고,
 * 누르면 전체 순위표로 간다.
 *
 * 팀 화면에 "이 팀이 지금 몇 위인가"가 없어서 순위표 탭으로 나갔다 와야 했다.
 * 한 팀 기준의 값이라 `GET /standings` 20행에서 그 팀 행만 골라 쓴다. 최근 5경기
 * 전적과 직전 경기 선발도 같이 넣고 싶었지만 그 둘은 경기 프리뷰
 * (`GET /matches/{id}`) 안에만 있어 팀 기준으로 물어볼 길이 없다. BE에 팀 단위
 * 엔드포인트가 생기면 이 카드 아래에 붙이면 된다.
 *
 * 챔스권이면 순위 숫자를 악센트로 칠한다 — 순위표(`StandingsTable`)가 같은 규칙을
 * 쓰므로 두 화면이 같은 뜻으로 읽힌다.
 *
 * @param row 이 팀의 순위표 한 행
 */
export function TeamStandingCard({ row }: { row: StandingRow }) {
  return (
    <Link
      href="/live/standings"
      className="bg-elevate rounded-control flex items-center gap-4 px-4 py-3 active:opacity-70"
      aria-label={`리그 ${row.rank}위, 승점 ${row.points}. 순위표 보기`}
    >
      <span className="flex shrink-0 items-baseline gap-0.5">
        <span
          className={`text-headline font-extrabold ${
            row.zone === "UCL" ? "text-accent" : "text-text"
          }`}
        >
          {row.rank}
        </span>
        <span className="text-caption text-text-4 font-bold">위</span>
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-label text-text font-semibold">
          {row.win}승 {row.draw}무 {row.lose}패
          <span className="text-text-4 ml-1.5 font-medium">
            {row.played}경기
          </span>
        </span>
        <span className="text-caption text-text-3">
          승점 {row.points} · 득실 {formatGoalDiff(row.goalDiff)} ·{" "}
          {LIVE_SEASON_LABEL}
        </span>
      </span>

      <ChevronMiniIcon size={16} className="text-text-4 shrink-0" />
    </Link>
  );
}

/** 득실차는 부호를 붙여야 읽힌다 — 0은 부호 없이 그대로 둔다. */
function formatGoalDiff(diff: number): string {
  return diff > 0 ? `+${diff}` : String(diff);
}

import { ratingTone, type LiveTeam, type TeamLineup } from "@plick/domain/live";

/**
 * 라인업 탭의 벤치 (피그마 L7 하단, KAN-567 톤). 시안에는 없지만 있는 데이터라
 * 선수별 스탯 표 아래 작게 둔다. 팀명 13/700 제목 아래 행 32px에 등번호, 이름,
 * 포지션, 평점(무출전 null은 "-")이다. 행을 누르면 선발과 같은 경기 스탯 시트가
 * 열린다.
 *
 * @param lineup 한 팀 라인업
 * @param onPlayerTap 선수 탭 콜백(선수 id, 소속 팀)
 */
export function BenchList({
  lineup,
  onPlayerTap,
}: {
  lineup: TeamLineup;
  onPlayerTap: (playerId: number, team: LiveTeam) => void;
}) {
  if (lineup.bench.length === 0) return null;

  return (
    <section>
      <h2 className="text-body text-text-strong pt-5 pb-1.5 font-bold">
        벤치 {lineup.team.name}
      </h2>
      {lineup.bench.map((player) => {
        const tone = ratingTone(player.rating);
        return (
          <button
            key={player.id}
            type="button"
            onClick={() => onPlayerTap(player.id, lineup.team)}
            className="border-border-soft flex h-8 w-full items-center gap-2 border-b text-left active:opacity-70"
          >
            <span className="text-caption-lg text-text-4 w-5.5 shrink-0 text-center">
              {player.number ?? "-"}
            </span>
            <span className="text-label-lg text-text min-w-0 flex-1 truncate font-medium">
              {player.name}
            </span>
            <span className="text-caption text-text-4 shrink-0">
              {player.position}
            </span>
            <span
              className={`text-caption-lg w-8 shrink-0 text-center font-bold ${
                tone === "accent"
                  ? "text-accent"
                  : tone === "warn"
                    ? "text-warn"
                    : "text-text-4"
              }`}
            >
              {player.rating === null ? "-" : player.rating.toFixed(1)}
            </span>
          </button>
        );
      })}
    </section>
  );
}

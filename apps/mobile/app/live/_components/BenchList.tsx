import { ratingTone, type TeamLineup } from "@plick/domain/live";

/**
 * 라인업 탭의 벤치 카드(피그마 L7 하단). `rating` null은 무출전 "-" 표기다.
 * 행을 누르면 선발과 같은 경기 스탯 시트가 열린다.
 */
export function BenchList({
  lineup,
  onPlayerTap,
}: {
  lineup: TeamLineup;
  onPlayerTap: (playerId: number) => void;
}) {
  if (lineup.bench.length === 0) return null;

  return (
    <section className="bg-elevate rounded-card flex flex-col p-4 pb-2">
      <div className="flex items-baseline justify-between pb-1">
        <h2 className="text-body text-text-2 font-bold">
          벤치 · {lineup.team.name}
        </h2>
        <span className="text-caption text-text-4">
          선수를 누르면 경기 스탯을 볼 수 있어요
        </span>
      </div>
      {lineup.bench.map((player, i) => {
        const tone = ratingTone(player.rating);
        return (
          <button
            key={player.id}
            type="button"
            onClick={() => onPlayerTap(player.id)}
            className={`flex items-center gap-3 py-2.5 text-left active:opacity-70 ${
              i > 0 ? "border-border border-t" : ""
            }`}
          >
            <span className="text-label text-text-4 w-6 shrink-0 text-center font-semibold">
              {player.number}
            </span>
            <span className="text-body text-text min-w-0 flex-1 truncate font-semibold">
              {player.name}
            </span>
            <span className="text-caption text-text-4 font-medium">
              {player.position}
            </span>
            <span
              className={`text-label w-7 text-right font-bold ${
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

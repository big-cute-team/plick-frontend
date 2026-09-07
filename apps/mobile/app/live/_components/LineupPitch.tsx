import { TEAMS } from "@plick/domain/constants";
import {
  ratingTone,
  type LineupPlayer,
  type TeamLineup,
} from "@plick/domain/live";

/**
 * 라인업 탭의 피치 렌더(피그마 L7). `grid`는 "줄:칸" 좌표(GK가 1줄)이고,
 * 어웨이는 위쪽·홈은 아래쪽으로 반전해 서로 마주 보게 그린다(명세 규약).
 * 선수 도트를 누르면 경기 스탯 시트가 열린다.
 *
 * @param onPlayerTap - 선수 도트 탭 콜백(선수 id) — 클라 탭 컨테이너가 넘긴다
 */
export function LineupPitch({
  home,
  away,
  onPlayerTap,
}: {
  home: TeamLineup;
  away: TeamLineup;
  onPlayerTap: (playerId: number) => void;
}) {
  return (
    <section className="border-accent-border/50 bg-accent/5 rounded-card relative flex flex-col gap-4 border px-2 py-3">
      <FormationTag lineup={away} />
      {gridLines(away.players).map((line, i) => (
        <PitchLine
          key={`away-${i}`}
          lineup={away}
          players={line}
          onPlayerTap={onPlayerTap}
        />
      ))}
      <span
        aria-hidden
        className="border-border/70 mx-auto -my-1 size-10 rounded-full border"
      />
      {gridLines(home.players)
        .reverse()
        .map((line, i) => (
          <PitchLine
            key={`home-${i}`}
            lineup={home}
            players={line}
            onPlayerTap={onPlayerTap}
          />
        ))}
      <FormationTag lineup={home} />
    </section>
  );
}

/** grid의 줄 번호(1=GK)대로 묶는다. grid null(벤치)은 여기 오지 않는다. */
function gridLines(players: LineupPlayer[]): LineupPlayer[][] {
  const lines: LineupPlayer[][] = [];
  for (const player of players) {
    const line = Number(player.grid?.split(":")[0] ?? 0);
    if (!line) continue;
    (lines[line - 1] ??= []).push(player);
  }
  return lines.filter((line) => line.length > 0);
}

function FormationTag({ lineup }: { lineup: TeamLineup }) {
  return (
    <span className="bg-elevate text-caption text-text-3 rounded-badge self-start px-2 py-0.5 font-bold">
      {lineup.team.shortName} · {lineup.formation}
    </span>
  );
}

function PitchLine({
  lineup,
  players,
  onPlayerTap,
}: {
  lineup: TeamLineup;
  players: LineupPlayer[];
  onPlayerTap: (playerId: number) => void;
}) {
  const colorVar = lineup.team.code
    ? TEAMS[lineup.team.code].colorVar
    : "--plk-avatar";
  return (
    <div className="flex items-start justify-around">
      {players.map((player) => {
        const tone = ratingTone(player.rating);
        return (
          <button
            key={player.id}
            type="button"
            onClick={() => onPlayerTap(player.id)}
            className="flex w-16 flex-col items-center gap-1 active:opacity-70"
          >
            <span className="relative">
              <span
                className="text-media-on text-label grid size-9 place-items-center rounded-full font-bold"
                style={{ backgroundColor: `var(${colorVar})` }}
              >
                {player.number}
              </span>
              {player.rating !== null && (
                <span
                  className={`bg-nav rounded-badge text-micro absolute -top-1.5 -right-3 border px-1 font-bold ${
                    tone === "accent"
                      ? "border-accent-border text-accent"
                      : "border-warn-border text-warn"
                  }`}
                >
                  {player.rating.toFixed(1)}
                </span>
              )}
            </span>
            <span className="text-micro text-text-2 w-16 truncate text-center">
              {player.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

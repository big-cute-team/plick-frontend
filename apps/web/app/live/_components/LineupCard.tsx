"use client";

import { useState } from "react";
import { TEAMS } from "@plick/domain/constants";
import {
  ratingTone,
  type LineupPlayer,
  type TeamLineup,
} from "@plick/domain/live";
import { PlayerMatchStatsModal } from "./PlayerMatchStatsModal";

/**
 * 상세 좌측의 라인업 카드(피그마 LW4) — 피치 렌더 + 홈 벤치. `grid`는
 * "줄:칸" 좌표(GK가 1줄), 어웨이 위·홈 아래 반전(명세 규약). 선수를 누르면
 * 경기 스탯 모달이 열린다 — 그 상태 때문에 클라 컴포넌트다.
 */
export function LineupCard({
  home,
  away,
}: {
  home: TeamLineup;
  away: TeamLineup;
}) {
  const [playerId, setPlayerId] = useState<number | null>(null);

  return (
    <section className="bg-elevate rounded-card flex flex-col gap-3 p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-body text-text-2 font-bold">라인업</h2>
        <span className="text-caption text-text-4">
          선수를 누르면 경기 스탯을 볼 수 있어요
        </span>
      </div>
      <div className="border-accent-border/50 bg-accent/5 rounded-card flex flex-col gap-5 border px-3 py-4">
        <FormationTag lineup={away} />
        {gridLines(away.players).map((line, i) => (
          <PitchLine
            key={`away-${i}`}
            lineup={away}
            players={line}
            onPlayerTap={setPlayerId}
          />
        ))}
        <span
          aria-hidden
          className="border-border/70 mx-auto -my-1.5 size-12 rounded-full border"
        />
        {gridLines(home.players)
          .reverse()
          .map((line, i) => (
            <PitchLine
              key={`home-${i}`}
              lineup={home}
              players={line}
              onPlayerTap={setPlayerId}
            />
          ))}
        <FormationTag lineup={home} />
      </div>
      <Bench lineup={home} onPlayerTap={setPlayerId} />
      <PlayerMatchStatsModal
        playerId={playerId}
        onClose={() => setPlayerId(null)}
      />
    </section>
  );
}

/** grid의 줄 번호(1=GK)대로 묶는다 — 벤치(grid null)는 오지 않는다. */
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
            className="group flex w-20 flex-col items-center gap-1"
          >
            <span className="relative">
              <span
                className="text-media-on text-label grid size-10 place-items-center rounded-full font-bold transition-transform group-hover:scale-110"
                style={{ backgroundColor: `var(${colorVar})` }}
              >
                {player.number}
              </span>
              {player.rating !== null && (
                <span
                  className={`bg-nav rounded-badge text-micro absolute -top-1.5 -right-3.5 border px-1 font-bold ${
                    tone === "accent"
                      ? "border-accent-border text-accent"
                      : "border-warn-border text-warn"
                  }`}
                >
                  {player.rating.toFixed(1)}
                </span>
              )}
            </span>
            <span className="text-micro text-text-2 group-hover:text-text w-20 truncate text-center transition-colors">
              {player.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Bench({
  lineup,
  onPlayerTap,
}: {
  lineup: TeamLineup;
  onPlayerTap: (playerId: number) => void;
}) {
  if (lineup.bench.length === 0) return null;
  return (
    <div className="flex flex-col">
      <h3 className="text-body text-text-2 pt-1 pb-1 font-bold">
        벤치 · {lineup.team.name}
      </h3>
      {lineup.bench.map((player, i) => {
        const tone = ratingTone(player.rating);
        return (
          <button
            key={player.id}
            type="button"
            onClick={() => onPlayerTap(player.id)}
            className={`hover:bg-elevate-2 rounded-tile flex items-center gap-3 px-1.5 py-2.5 text-left transition-colors ${
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
    </div>
  );
}

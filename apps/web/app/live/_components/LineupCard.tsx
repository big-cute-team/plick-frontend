"use client";

import { useState } from "react";
import { TEAMS } from "@plick/domain/constants";
import {
  ratingTone,
  type LineupPlayer,
  type LiveTeam,
  type TeamLineup,
} from "@plick/domain/live";
import { PlayerMatchStatsModal } from "./PlayerMatchStatsModal";

/**
 * 라인업 탭의 카드(피그마 LW4 → KAN-462 확대) — 피치 렌더 + 양 팀 벤치. `grid`는
 * "줄:칸" 좌표(GK가 1줄), 어웨이 위·홈 아래 반전(명세 규약). 선수를 누르면
 * 경기 스탯 모달이 열린다 — 그 상태 때문에 클라 컴포넌트다. 스탯 응답엔
 * 팀명이 없어 눌린 자리의 팀을 같이 들고 간다.
 *
 * @param matchId - 경기 id (선수 스탯 조회용)
 * @param live - 라이브 중이면 모달을 열 때마다 스탯을 다시 받는다
 */
export function LineupCard({
  matchId,
  live,
  home,
  away,
}: {
  matchId: number;
  live: boolean;
  home: TeamLineup;
  away: TeamLineup;
}) {
  const [player, setPlayer] = useState<{ id: number; team: LiveTeam } | null>(
    null,
  );
  const onPlayerTap = (id: number, team: LiveTeam) => setPlayer({ id, team });

  return (
    <section className="bg-elevate rounded-card flex flex-col gap-4 p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-title text-text font-bold">라인업</h2>
        <span className="text-body text-text-4">
          선수를 누르면 경기 스탯을 볼 수 있어요
        </span>
      </div>
      <div className="border-accent-border/50 bg-accent/5 rounded-card flex flex-col gap-7 border px-4 py-6">
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
          className="border-border/70 mx-auto -my-2 size-16 rounded-full border"
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
      </div>
      <Bench lineup={home} onPlayerTap={onPlayerTap} />
      <Bench lineup={away} onPlayerTap={onPlayerTap} />
      <PlayerMatchStatsModal
        matchId={matchId}
        live={live}
        player={player}
        onClose={() => setPlayer(null)}
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
    <span className="bg-elevate text-body text-text-3 rounded-badge self-start px-2.5 py-1 font-bold">
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
  onPlayerTap: (playerId: number, team: LiveTeam) => void;
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
            onClick={() => onPlayerTap(player.id, lineup.team)}
            className="group flex w-28 flex-col items-center gap-1.5"
          >
            <span className="relative">
              <span
                className="text-media-on text-body-lg grid size-14 place-items-center rounded-full font-bold transition-transform group-hover:scale-110"
                style={{ backgroundColor: `var(${colorVar})` }}
              >
                {player.number}
              </span>
              {player.rating !== null && (
                <span
                  className={`bg-nav rounded-badge text-label absolute -top-2 -right-5 border px-1.5 font-bold ${
                    tone === "accent"
                      ? "border-accent-border text-accent"
                      : "border-warn-border text-warn"
                  }`}
                >
                  {player.rating.toFixed(1)}
                </span>
              )}
            </span>
            <span className="text-body text-text-2 group-hover:text-text w-28 truncate text-center transition-colors">
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
  onPlayerTap: (playerId: number, team: LiveTeam) => void;
}) {
  if (lineup.bench.length === 0) return null;
  return (
    <div className="flex flex-col">
      <h3 className="text-body-lg text-text-2 pt-2 pb-1 font-bold">
        벤치 · {lineup.team.name}
      </h3>
      {lineup.bench.map((player, i) => {
        const tone = ratingTone(player.rating);
        return (
          <button
            key={player.id}
            type="button"
            onClick={() => onPlayerTap(player.id, lineup.team)}
            className={`hover:bg-elevate-2 rounded-tile flex items-center gap-4 px-2 py-3 text-left transition-colors ${
              i > 0 ? "border-border border-t" : ""
            }`}
          >
            <span className="text-body text-text-4 w-7 shrink-0 text-center font-semibold">
              {player.number}
            </span>
            <span className="text-body-lg text-text min-w-0 flex-1 truncate font-semibold">
              {player.name}
            </span>
            <span className="text-body text-text-4 font-medium">
              {player.position}
            </span>
            <span
              className={`text-body-lg w-9 text-right font-bold ${
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

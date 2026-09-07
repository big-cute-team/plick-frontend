"use client";

import { useState } from "react";
import {
  POSITION_LABEL,
  POSITION_ORDER,
  type SquadPlayer,
  type TeamSquad,
} from "@plick/domain/live";
import { ChevronMiniIcon } from "@plick/ui/icons";
import { PlayerPhoto } from "./PlayerPhoto";
import { SeasonStatsModal } from "./SeasonStatsModal";

/**
 * 팀 스쿼드의 포지션 그룹(피그마 LW6) — 데스크톱은 2컬럼 그리드, lg 아래는
 * 1열 스택. 선수 행을 누르면 시즌 스탯 모달(LW7)이 열린다.
 */
export function SquadGroups({ squad }: { squad: TeamSquad }) {
  const [player, setPlayer] = useState<SquadPlayer | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 items-start gap-x-8 gap-y-5 lg:grid-cols-2">
        {POSITION_ORDER.map((position) => {
          const players = squad.players.filter(
            (player) => player.position === position,
          );
          if (players.length === 0) return null;
          return (
            <section key={position} className="flex flex-col gap-2">
              <h2 className="text-label text-text-3 font-bold">
                {POSITION_LABEL[position]}
              </h2>
              <div className="bg-elevate rounded-card flex flex-col px-4 py-1">
                {players.map((player, i) => (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => setPlayer(player)}
                    className={`group flex items-center gap-3 py-3 text-left ${
                      i > 0 ? "border-border border-t" : ""
                    }`}
                  >
                    <PlayerPhoto
                      src={player.photo}
                      name={player.name}
                      size={36}
                    />
                    <span className="text-body-lg text-text min-w-0 flex-1 truncate font-semibold">
                      {player.name}
                    </span>
                    {player.number !== null && (
                      <span className="text-label text-text-4 font-bold">
                        No.{player.number}
                      </span>
                    )}
                    <span className="text-text-4 group-hover:text-text-2 transition-colors">
                      <ChevronMiniIcon size={14} />
                    </span>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <p className="text-caption text-text-4 pt-6 text-center">
        선수를 누르면 시즌 스탯을 볼 수 있어요
      </p>
      <SeasonStatsModal
        player={player}
        team={squad.team}
        onClose={() => setPlayer(null)}
      />
    </>
  );
}

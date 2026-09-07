"use client";

import { useState } from "react";
import {
  POSITION_LABEL,
  POSITION_ORDER,
  type TeamSquad,
} from "@plick/domain/live";
import { ChevronMiniIcon } from "@plick/ui/icons";
import { SeasonStatsSheet } from "./SeasonStatsSheet";

/**
 * 팀 스쿼드 목록(피그마 L11) — 포지션 그룹별 카드에 선수 행을 쌓고, 행을
 * 누르면 시즌 스탯 시트(L12·L13)가 열린다. 시트 상태 때문에 클라 컴포넌트다.
 */
export function SquadList({ squad }: { squad: TeamSquad }) {
  const [playerId, setPlayerId] = useState<number | null>(null);

  return (
    <div className="px-edge flex flex-col gap-4 pt-1 pb-6">
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
                  onClick={() => setPlayerId(player.id)}
                  className={`flex items-center gap-3 py-3 text-left active:opacity-70 ${
                    i > 0 ? "border-border border-t" : ""
                  }`}
                >
                  <span className="bg-avatar size-9 shrink-0 rounded-full" />
                  <span className="text-body-lg text-text min-w-0 flex-1 truncate font-semibold">
                    {player.name}
                  </span>
                  {player.number !== null && (
                    <span className="text-label text-text-4 font-bold">
                      No.{player.number}
                    </span>
                  )}
                  <span className="text-text-4">
                    <ChevronMiniIcon size={14} />
                  </span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
      <SeasonStatsSheet playerId={playerId} onClose={() => setPlayerId(null)} />
    </div>
  );
}

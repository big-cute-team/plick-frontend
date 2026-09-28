"use client";

import { useState } from "react";
import {
  POSITION_LABEL,
  POSITION_ORDER,
  type SquadPlayer,
  type TeamSquad,
} from "@plick/domain/live";
import { SeasonStatsModal } from "@/live/_components/SeasonStatsModal";
import { SquadTrack } from "./SquadTrack";

/**
 * 팀 프로필 선수단 (KAN-574). 포지션(GK, DF, MF, FW)마다 한 줄이고 한 줄은 가로로
 * 넘기는 선수 칩 트랙이다. 네 줄이 한 화면에 다 든다. 칩은 등번호 + 이름이고 누르면
 * 시즌 스탯 다이얼로그가 열린다.
 *
 * 전에는 포지션 순으로 한 명씩 표 행을 이어 깔아(`SquadTable`) 명단이 화면 몇 장을
 * 내려갔다. 표의 포지션 열은 줄 머리가 대신한다. 선수가 없는 포지션 줄은 그리지 않는다.
 *
 * @param squad 팀 선수단
 */
export function SquadRows({ squad }: { squad: TeamSquad }) {
  const [player, setPlayer] = useState<SquadPlayer | null>(null);

  return (
    <>
      <div className="border-border-soft flex flex-col border-t">
        {POSITION_ORDER.map((position) => {
          const players = squad.players.filter((p) => p.position === position);
          if (players.length === 0) return null;
          return (
            <SquadTrack
              key={position}
              label={POSITION_LABEL[position]}
              players={players}
              onSelect={setPlayer}
            />
          );
        })}
      </div>
      <SeasonStatsModal
        player={player}
        team={squad.team}
        onClose={() => setPlayer(null)}
      />
    </>
  );
}

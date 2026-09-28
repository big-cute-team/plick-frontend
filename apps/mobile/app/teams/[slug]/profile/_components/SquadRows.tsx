"use client";

import { useState } from "react";
import {
  POSITION_LABEL,
  POSITION_ORDER,
  type SquadPlayer,
  type TeamSquad,
} from "@plick/domain/live";
import { SeasonStatsSheet } from "@/live/_components/SeasonStatsSheet";

/**
 * 팀 프로필 선수단 (KAN-574). 포지션(GK, DF, MF, FW)마다 한 줄이고 한 줄은 가로로
 * 미는 선수 칩 트랙이다. 네 줄이 한 화면에 다 든다. 칩은 등번호 + 이름이고 누르면
 * 시즌 스탯 시트가 열린다. 시트 상태 때문에 클라 컴포넌트다.
 *
 * 전에는 포지션 순으로 한 명씩 행을 쌓아(`SquadList`) 서른 명 가까운 명단이 화면
 * 몇 장을 내려갔다. 행에 있던 포지션 라벨은 줄 머리가 대신한다. 선수가 없는
 * 포지션 줄은 그리지 않는다.
 *
 * @param squad 팀 스쿼드
 */
export function SquadRows({ squad }: { squad: TeamSquad }) {
  const [player, setPlayer] = useState<SquadPlayer | null>(null);

  return (
    <>
      <div className="flex flex-col gap-2.5 py-3">
        {POSITION_ORDER.map((position) => {
          const players = squad.players.filter((p) => p.position === position);
          if (players.length === 0) return null;
          return (
            <section
              key={position}
              aria-label={POSITION_LABEL[position]}
              className="flex items-center"
            >
              <h3 className="text-caption text-text-3 w-14 shrink-0 font-bold">
                {POSITION_LABEL[position]}
              </h3>
              {/* 화면 끝까지 밀리도록 오른쪽 가장자리 여백을 트랙이 먹는다 */}
              <ul className="no-scrollbar -mr-edge pr-edge flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
                {players.map((p) => (
                  <li key={p.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => setPlayer(p)}
                      className="border-border rounded-tile flex h-9 items-center gap-1.5 border px-2.5 active:opacity-70"
                    >
                      <span className="text-caption text-text-4 font-bold">
                        {p.number ?? "-"}
                      </span>
                      <span className="text-label-lg text-text-strong font-bold whitespace-nowrap">
                        {p.name}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      <SeasonStatsSheet
        player={player}
        team={squad.team}
        onClose={() => setPlayer(null)}
      />
    </>
  );
}

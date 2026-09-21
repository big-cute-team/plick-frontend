"use client";

import { useState } from "react";
import {
  POSITION_LABEL,
  POSITION_ORDER,
  type SquadPlayer,
  type TeamSquad,
} from "@plick/domain/live";
import { PlayerPhoto } from "@plick/ui/PlayerPhoto";
import { SeasonStatsSheet } from "@/live/_components/SeasonStatsSheet";
import { SQUAD_TILE_PHOTO } from "@/_constants/team-profile";

/**
 * 팀 프로필 선수단 — 포지션마다 한 섹션을 깔고 그 안에 선수 타일을 3열로 놓는다
 * (KAN-484). 타일을 누르면 시즌 스탯 시트가 열린다. 시트 상태 때문에 클라
 * 컴포넌트다.
 *
 * 전에는 포지션 카드 안에 이름 한 줄짜리 행을 쌓았다(`SquadList`). 33명이
 * 한 줄씩 서니 세로로 한참 내려갔고, 선수 얼굴은 36px 원으로 이름 옆에 붙어
 * 있어 누가 누구인지 알아보기 어려웠다. 얼굴을 타일의 주인공으로 올리고 이름과
 * 등번호를 아래에 붙였다.
 *
 * 3열인 이유는 화면 폭이다. 2열이면 타일이 커져 포지션 하나가 화면을 넘기고,
 * 4열이면 사진이 40px대로 줄어 결국 전과 같아진다. 3열이면 320px 화면에서도
 * 타일 안쪽이 74px는 남아 사진(`SQUAD_TILE_PHOTO`)이 들어간다.
 *
 * `PlayerPhoto`는 사진이 없거나 로드에 실패하면 같은 크기의 원으로 떨어지므로
 * (API-Football 사진은 빠지는 선수가 있다) 타일 높이가 흔들리지 않는다.
 *
 * @param squad 팀 스쿼드
 */
export function SquadGrid({ squad }: { squad: TeamSquad }) {
  const [player, setPlayer] = useState<SquadPlayer | null>(null);

  return (
    <div className="px-edge flex flex-col gap-5 pt-1 pb-6">
      {POSITION_ORDER.map((position) => {
        const players = squad.players.filter(
          (player) => player.position === position,
        );
        if (players.length === 0) return null;
        return (
          <section key={position} className="flex flex-col gap-2">
            <h2 className="text-label text-text-3 font-bold">
              {POSITION_LABEL[position]}
              <span className="text-text-4 ml-1.5 font-semibold">
                {players.length}
              </span>
            </h2>
            <ul className="grid grid-cols-3 gap-2">
              {players.map((player) => (
                <li key={player.id}>
                  <button
                    type="button"
                    onClick={() => setPlayer(player)}
                    className="bg-elevate rounded-card flex w-full flex-col items-center gap-1.5 px-2 pt-3 pb-2.5 active:opacity-70"
                  >
                    <span className="flex w-full items-center justify-center">
                      <PlayerPhoto
                        src={player.photo}
                        name={player.name}
                        size={SQUAD_TILE_PHOTO}
                      />
                    </span>
                    <span className="text-caption text-text w-full truncate text-center font-bold">
                      {player.name}
                    </span>
                    <span className="text-micro text-text-4 font-bold">
                      {player.number === null ? "―" : `No.${player.number}`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <SeasonStatsSheet
        player={player}
        team={squad.team}
        onClose={() => setPlayer(null)}
      />
    </div>
  );
}

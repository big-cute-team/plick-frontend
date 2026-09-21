"use client";

import { useState } from "react";
import {
  POSITION_LABEL,
  POSITION_ORDER,
  type SquadPlayer,
  type TeamSquad,
} from "@plick/domain/live";
import { PlayerPhoto } from "@plick/ui/PlayerPhoto";
import { SQUAD_TILE_PHOTO } from "@/_constants/team-profile";
import { SeasonStatsModal } from "@/live/_components/SeasonStatsModal";

/**
 * 팀 프로필 선수단 — 포지션마다 한 섹션을 가로로 다 쓰고 그 안에 선수 타일을
 * 늘어놓는다 (KAN-484). 타일을 누르면 시즌 스탯 모달이 열린다.
 *
 * 전에는 포지션 그룹 자체를 2열 그리드에 넣었다(`SquadGroups`). 골키퍼는 4명,
 * 수비수는 10명이라 짧은 열이 먼저 끝나고 그 아래가 통째로 빈 채로 다음 그룹이
 * 오른쪽에서 시작했다 — 화면 가운데에 세로로 긴 공백이 생겼다. 그리드를 그룹이
 * 아니라 선수에 걸면 그 공백이 사라진다. 섹션은 위에서 아래로 포워드, 미드필더,
 * 수비수 순으로 한 줄씩 내려간다.
 *
 * 열 수는 폭에 따라 3·4·6으로 늘린다. 사진 크기는 모바일 타일과 같은 값을 쓴다 —
 * 데스크톱에서 얼굴을 더 키우면 한 포지션이 화면을 넘어 다시 스크롤이 길어진다.
 *
 * @param squad 팀 스쿼드
 */
export function SquadGrid({ squad }: { squad: TeamSquad }) {
  const [player, setPlayer] = useState<SquadPlayer | null>(null);

  return (
    <>
      <div className="flex flex-col gap-7">
        {POSITION_ORDER.map((position) => {
          const players = squad.players.filter(
            (player) => player.position === position,
          );
          if (players.length === 0) return null;
          return (
            <section key={position} className="flex flex-col gap-3">
              <h2 className="text-body-lg text-text-3 font-bold">
                {POSITION_LABEL[position]}
                <span className="text-text-4 ml-1.5 font-semibold">
                  {players.length}
                </span>
              </h2>
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {players.map((player) => (
                  <li key={player.id}>
                    <button
                      type="button"
                      onClick={() => setPlayer(player)}
                      className="bg-elevate rounded-card hover:bg-elevate-2 focus-visible:outline-accent flex w-full flex-col items-center gap-2 px-3 pt-4 pb-3 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2"
                    >
                      <PlayerPhoto
                        src={player.photo}
                        name={player.name}
                        size={SQUAD_TILE_PHOTO}
                      />
                      <span className="text-body text-text w-full truncate text-center font-bold">
                        {player.name}
                      </span>
                      <span className="text-caption text-text-4 font-bold">
                        {player.number === null ? "―" : `No.${player.number}`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
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

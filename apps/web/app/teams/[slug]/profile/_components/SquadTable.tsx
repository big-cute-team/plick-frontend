"use client";

import { useState } from "react";
import {
  POSITION_LABEL,
  POSITION_ORDER,
  type SquadPlayer,
  type TeamSquad,
} from "@plick/domain/live";
import { SeasonStatsModal } from "@/live/_components/SeasonStatsModal";

/** 선수단 표 열 그리드 (시안 프로필 1302행에서 경기, 골, 도움, 평점 열을 뺀 값). */
const COLS = "grid-cols-[36px_minmax(0,1fr)_64px]";

/**
 * 팀 프로필 선수단 표 (KAN-484 타일 그리드 → KAN-567 시안 프로필 1297-1321행). 머리
 * 10.5 보조색에 표 테두리, 행 36px에 번호 12, 이름 13.5/700, 포지션 12다. 포지션
 * 순(GK, DF, MF, FW)으로 이어 깔고 행을 누르면 시즌 스탯 다이얼로그가 열린다.
 *
 * 시안의 경기, 골, 도움, 평점 열은 선수단 응답에 없어(번호, 이름, 포지션, 사진뿐)
 * 뺐다. 그 값은 행을 눌러 여는 시즌 스탯에서 본다. 전에는 파일 이름이 `SquadGrid`였다.
 *
 * @param squad 팀 선수단
 */
export function SquadTable({ squad }: { squad: TeamSquad }) {
  const [player, setPlayer] = useState<SquadPlayer | null>(null);
  const players = POSITION_ORDER.flatMap((position) =>
    squad.players.filter((p) => p.position === position),
  );

  return (
    <>
      <div
        className={`border-border-table text-micro-lg text-text-4 grid h-7 items-center gap-2 border-b ${COLS}`}
      >
        <span className="text-center">#</span>
        <span>이름</span>
        <span>포지션</span>
      </div>
      {players.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => setPlayer(p)}
          className={`border-border-soft hover:bg-elevate-2 focus-visible:outline-accent grid h-9 w-full items-center gap-2 border-b text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 ${COLS}`}
        >
          <span className="text-label text-text-4 text-center">
            {p.number ?? "-"}
          </span>
          <span className="text-body text-text-strong min-w-0 truncate font-bold">
            {p.name}
          </span>
          <span className="text-label text-text-3">
            {POSITION_LABEL[p.position]}
          </span>
        </button>
      ))}
      <SeasonStatsModal
        player={player}
        team={squad.team}
        onClose={() => setPlayer(null)}
      />
    </>
  );
}

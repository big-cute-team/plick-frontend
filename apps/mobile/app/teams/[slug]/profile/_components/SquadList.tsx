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
 * 팀 프로필 선수단 (KAN-484, KAN-567 리디자인, 시안 팀 프로필 선수단). 포지션
 * 순으로 한 줄씩 쌓고 행은 등번호(24px 칼럼), 이름 13.5/700, 포지션 11이다.
 * 행을 누르면 시즌 스탯 시트가 열린다. 시트 상태 때문에 클라 컴포넌트다.
 *
 * KAN-484의 사진 타일 3열 그리드(`SquadGrid`)를 시안대로 행 목록으로 되돌렸다.
 * 시안 행의 "N경기 N골 N도움"과 평점은 스쿼드 응답에 없어 뺐다(API 공백). 그
 * 값은 행을 눌러 여는 시즌 스탯 시트가 보여준다. 사진은 시안 규칙대로 그리지
 * 않는다.
 *
 * @param squad 팀 스쿼드
 */
export function SquadList({ squad }: { squad: TeamSquad }) {
  const [player, setPlayer] = useState<SquadPlayer | null>(null);
  const players = POSITION_ORDER.flatMap((position) =>
    squad.players.filter((p) => p.position === position),
  );

  return (
    <>
      <ul>
        {players.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => setPlayer(p)}
              className="border-border-soft flex w-full items-center gap-2.5 border-b py-2.5 text-left active:opacity-70"
            >
              <span className="text-label text-text-4 w-6 shrink-0 text-center font-bold">
                {p.number ?? "-"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-body text-text-strong block truncate font-bold">
                  {p.name}
                </span>
                <span className="text-caption text-text-3 mt-0.5 block">
                  {POSITION_LABEL[p.position]}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <SeasonStatsSheet
        player={player}
        team={squad.team}
        onClose={() => setPlayer(null)}
      />
    </>
  );
}

"use client";

import { useState } from "react";
import { TEAMS, TEAM_ORDER } from "@plick/domain/constants";
import type { TeamCode } from "@plick/domain/types";
import { TeamCrestCard } from "@/_components/TeamCrestCard";

/**
 * 응원팀 선택 — 빅6 팀 크레스트 카드 3열 그리드에서 하나를 고르고, 아래 저장 버튼.
 *
 * 카드는 공용 `TeamCrestCard`(온보딩 팀 선택과 동일 마크업)를 쓰고, 이 화면은
 * 3열 배치·저장 버튼만 담당한다. 선택 상태는 로컬로만 유지하고 저장은
 * 미연결(퍼블리싱 단계).
 *
 * @param initial - 최초 선택 팀 코드
 */
export function FavoriteTeamPicker({ initial }: { initial: TeamCode }) {
  const [selected, setSelected] = useState<TeamCode>(initial);

  return (
    <div className="gap-gap-lg flex flex-col">
      <div className="flex items-baseline gap-1.5">
        <span className="text-tab text-text font-extrabold">응원팀</span>
        <span className="text-caption text-text-4">응원할 팀을 선택하세요</span>
      </div>

      <div className="gap-gap grid grid-cols-3">
        {TEAM_ORDER.map((code) => (
          <TeamCrestCard
            key={code}
            team={TEAMS[code]}
            selected={selected === code}
            onSelect={() => setSelected(code)}
            className="min-h-29.5"
          />
        ))}
      </div>

      <button
        type="button"
        className="bg-accent text-on-accent rounded-pill text-body-lg focus-visible:outline-accent flex h-13 w-full items-center justify-center font-extrabold transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 active:opacity-80"
      >
        변경사항 저장
      </button>
    </div>
  );
}

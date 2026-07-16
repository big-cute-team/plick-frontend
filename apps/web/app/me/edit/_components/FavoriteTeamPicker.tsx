"use client";

import { useState } from "react";
import { CheckIcon } from "@plick/ui/icons";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { TEAMS, TEAM_ORDER } from "@/_lib/constants";
import type { TeamCode } from "@/_lib/types";

/**
 * 응원팀 선택 — 빅6 팀 크레스트 카드 3열 그리드에서 하나를 고르고, 아래 저장 버튼.
 *
 * 선택 카드는 accent 보더 + 우상단 체크 배지. 선택 상태는 로컬로만 유지하고
 * 저장은 미연결(퍼블리싱 단계). 온보딩 `TeamSelectGrid`와 같은 카드 패턴이되
 * 데스크톱 3열 배치와 저장 버튼을 합쳐 이 화면 전용으로 둔다.
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
        {TEAM_ORDER.map((code) => {
          const active = selected === code;
          return (
            <button
              key={code}
              type="button"
              onClick={() => setSelected(code)}
              aria-pressed={active}
              className={`bg-elevate-2 rounded-card focus-visible:outline-accent relative flex min-h-29.5 flex-col items-center justify-center gap-2.5 border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 active:opacity-80 ${
                active
                  ? "border-accent"
                  : "border-border hover:border-border-strong"
              }`}
            >
              <TeamCrest team={TEAMS[code]} size={40} />
              <span className="text-body text-text">{TEAMS[code].name}</span>
              {active && (
                <span className="bg-accent text-on-accent absolute top-2.5 right-3 grid size-5.5 place-items-center rounded-full">
                  <CheckIcon size={12} />
                </span>
              )}
            </button>
          );
        })}
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

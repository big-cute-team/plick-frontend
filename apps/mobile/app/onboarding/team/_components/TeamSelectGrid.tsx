"use client";

import { useState } from "react";
import { CheckIcon } from "@/_components/icons";
import { TeamCrest } from "@/_components/TeamCrest";
import { TEAMS, TEAM_ORDER } from "@/_lib/constants";
import type { TeamCode } from "@/_lib/types";

/**
 * 마이팀 선택 그리드 — 빅6 팀 카드 2열, 선택 카드는 accent 보더 + 체크 배지.
 *
 * 선택 상태는 로컬로만 유지(퍼블리싱 단계라 저장은 미연결).
 *
 * @param initial - 최초 선택 팀 코드
 */
export function TeamSelectGrid({ initial }: { initial: TeamCode }) {
  const [selected, setSelected] = useState<TeamCode>(initial);

  return (
    <div className="grid grid-cols-2 gap-3">
      {TEAM_ORDER.map((code) => {
        const active = code === selected;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setSelected(code)}
            aria-pressed={active}
            className={`bg-elevate-2 rounded-card relative flex h-30 flex-col items-center justify-center gap-2.5 border active:opacity-80 ${
              active ? "border-accent" : "border-border"
            }`}
          >
            <TeamCrest team={code} size={51} />
            <span className="text-body text-text font-bold">
              {TEAMS[code].name}
            </span>
            {active && (
              <span className="bg-accent text-on-accent absolute top-2.5 right-3 grid size-5.5 place-items-center rounded-full">
                <CheckIcon size={12} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

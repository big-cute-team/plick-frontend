"use client";

import { TEAMS, TEAM_ORDER } from "@plick/domain/constants";
import type { TeamCode } from "@plick/domain/types";
import { useTeamSelection } from "@/_lib/useTeamSelection";

/**
 * 응원팀 선택 — 빅6 팀 칩 중 하나를 고른다.
 *
 * 선택 상태는 로컬로만 유지(퍼블리싱 단계라 저장은 미연결).
 *
 * @param initial - 최초 선택 팀 코드
 */
export function TeamPicker({ initial }: { initial: TeamCode }) {
  const { select, isSelected } = useTeamSelection(initial);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline gap-1.5">
        <span className="text-body text-text font-extrabold">응원팀</span>
        <span className="text-caption text-text-4">응원할 팀을 선택하세요</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {TEAM_ORDER.map((code) => {
          const active = isSelected(code);
          return (
            <button
              key={code}
              type="button"
              onClick={() => select(code)}
              className={`rounded-pill text-body border px-3.5 py-2 active:opacity-70 ${
                active
                  ? "bg-accent-tint border-accent text-accent font-extrabold"
                  : "bg-elevate-2 border-border text-text-3 font-semibold"
              }`}
            >
              {TEAMS[code].name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { TEAMS, TEAM_ORDER } from "@plick/domain/constants";
import type { TeamCode } from "@plick/domain/types";

/**
 * 응원팀 선택 — 빅6 팀 칩 다중 선택(토글).
 * 선택 상태는 부모(ProfileEditForm)가 들고 있는 제어형 — 저장 시 선택값이 필요해서다.
 *
 * @param selected - 현재 선택된 팀 코드 목록
 * @param onToggle - 팀 칩 클릭 핸들러 (선택⇄해제)
 */
export function TeamPicker({
  selected,
  onToggle,
}: {
  selected: TeamCode[];
  onToggle: (code: TeamCode) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline gap-1.5">
        <span className="text-body text-text font-extrabold">응원팀</span>
        <span className="text-caption text-text-4">응원할 팀을 선택하세요</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {TEAM_ORDER.map((code) => {
          const active = selected.includes(code);
          return (
            <button
              key={code}
              type="button"
              onClick={() => onToggle(code)}
              aria-pressed={active}
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

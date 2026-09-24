"use client";

import { TEAMS, TEAM_ORDER } from "@plick/domain/constants";
import type { TeamCode } from "@plick/domain/types";
import { TeamCrest } from "@plick/ui/TeamCrest";

/**
 * 응원팀 선택 — 빅6 칩 다중 토글 (KAN-319 → KAN-567). 계정 행의 응원팀 칩과 같은
 * 모양(표 테두리, 엠블럼 18, 12.5/700)이고 고른 칩은 강조색 테두리와 글자다. 전에는
 * 온보딩과 같은 크레스트 카드 그리드였는데 계정 행 안에서 인라인으로 고치는 자리라
 * 칩이 맞다. 선택 상태는 부모(ProfileEditForm)가 드는 제어형이다. 저장 시 선택값이
 * 필요해서다.
 *
 * @param selected 현재 선택된 팀 코드 목록
 * @param onToggle 칩 클릭 핸들러 (선택⇄해제)
 */
export function FavoriteTeamPicker({
  selected,
  onToggle,
}: {
  selected: TeamCode[];
  onToggle: (code: TeamCode) => void;
}) {
  return (
    <div
      className="flex flex-1 flex-wrap gap-2"
      role="group"
      aria-label="응원팀"
    >
      {TEAM_ORDER.map((code) => {
        const on = selected.includes(code);
        return (
          <button
            key={code}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(code)}
            className={`hover:border-accent focus-visible:outline-accent flex items-center gap-1.75 border py-1.5 pr-3.25 pl-2.25 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
              on
                ? "border-accent text-accent"
                : "border-border-table text-text-strong"
            }`}
          >
            <TeamCrest team={TEAMS[code]} size={18} />
            <span className="text-label-lg font-bold">{TEAMS[code].name}</span>
          </button>
        );
      })}
    </div>
  );
}

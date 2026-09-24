"use client";

import { TEAMS, TEAM_ORDER } from "@plick/domain/constants";
import type { TeamCode } from "@plick/domain/types";
import { TeamCrest } from "@plick/ui/TeamCrest";

/**
 * 응원팀 선택. 빅6 팀 pill 칩 다중 선택(토글). 계정 화면의 응원팀 행 "수정"을
 * 누르면 행 아래에 펼쳐진다(KAN-567). 고른 칩은 accent 채움, 나머지는 칩 면이다.
 * 선택 상태는 부모(ProfileEditForm)가 들고 있는 제어형이다. 저장 시 선택값이 필요해서다.
 *
 * @param selected 현재 선택된 팀 코드 목록
 * @param onToggle 팀 칩 클릭 핸들러 (선택⇄해제)
 */
export function TeamPicker({
  selected,
  onToggle,
}: {
  selected: TeamCode[];
  onToggle: (code: TeamCode) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.75">
      {TEAM_ORDER.map((code) => {
        const active = selected.includes(code);
        return (
          <button
            key={code}
            type="button"
            onClick={() => onToggle(code)}
            aria-pressed={active}
            className={`rounded-pill text-label-lg flex h-8.5 items-center gap-1.5 pr-3.25 pl-2.25 font-bold active:opacity-70 ${
              active ? "bg-accent text-on-accent" : "bg-chip text-text-3"
            }`}
          >
            <TeamCrest team={TEAMS[code]} size={20} />
            {TEAMS[code].name}
          </button>
        );
      })}
    </div>
  );
}

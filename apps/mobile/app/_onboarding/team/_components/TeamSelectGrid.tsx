"use client";

import { CheckIcon } from "@plick/ui/icons";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { TEAMS, TEAM_ORDER } from "@plick/domain/constants";
import type { TeamCode } from "@plick/domain/types";

/**
 * 응원팀 선택 그리드 — 빅6 팀 카드 2열, 선택 카드는 accent 보더 + 체크 배지.
 * 다중 선택(토글)이며, 선택 상태는 부모(TeamStep)가 들고 있는 제어형 — 제출 시 선택값이 필요해서다.
 *
 * @param selected - 현재 선택된 팀 코드 목록
 * @param onToggle - 팀 카드 클릭 핸들러 (선택⇄해제)
 */
export function TeamSelectGrid({
  selected,
  onToggle,
}: {
  selected: TeamCode[];
  onToggle: (code: TeamCode) => void;
}) {
  return (
    <div className="gap-gap grid grid-cols-2">
      {TEAM_ORDER.map((code) => {
        const active = selected.includes(code);
        return (
          <button
            key={code}
            type="button"
            onClick={() => onToggle(code)}
            aria-pressed={active}
            className={`bg-elevate-2 rounded-card relative flex h-30 flex-col items-center justify-center gap-2.5 border active:opacity-80 ${
              active ? "border-accent" : "border-border"
            }`}
          >
            <TeamCrest team={TEAMS[code]} size={51} />
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

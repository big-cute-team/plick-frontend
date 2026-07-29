"use client";

import { TEAMS, TEAM_ORDER } from "@plick/domain/constants";
import type { TeamCode } from "@plick/domain/types";
import { TeamCrestCard } from "@/_components/TeamCrestCard";

/**
 * 응원팀 선택 — 빅6 팀 크레스트 카드 3열 그리드 다중 토글 (KAN-319).
 * 카드는 공용 `TeamCrestCard`(온보딩 팀 선택과 동일 마크업)를 쓰고, 이 화면은
 * 3열 배치만 담당한다. 응원팀이 다중 선택 계약이라 단일 선택에서 토글로 바꿨고,
 * 선택 상태는 부모(ProfileEditForm)가 드는 제어형 — 저장 시 선택값이 필요해서다.
 *
 * @param selected - 현재 선택된 팀 코드 목록
 * @param onToggle - 카드 클릭 핸들러 (선택⇄해제)
 */
export function FavoriteTeamPicker({
  selected,
  onToggle,
}: {
  selected: TeamCode[];
  onToggle: (code: TeamCode) => void;
}) {
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
            selected={selected.includes(code)}
            onSelect={() => onToggle(code)}
            className="min-h-29.5"
          />
        ))}
      </div>
    </div>
  );
}

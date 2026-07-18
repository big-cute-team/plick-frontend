import { CheckIcon } from "@plick/ui/icons";
import { TeamCrest } from "@plick/ui/TeamCrest";
import type { Team } from "@plick/domain/types";

/**
 * 팀 크레스트 선택 카드 — 크레스트 + 팀명, 선택 시 accent 보더 + 우상단 체크 배지.
 * 온보딩 팀 선택(W9)·프로필 수정 응원팀 픽커가 공용. 그리드 열 수·높이는 부모가 정한다.
 *
 * hover는 `border-border-strong`, 포커스는 outline-accent로 통일한다(감사 2026-07-16에서
 * 두 화면이 hover·focus 관용을 다르게 쓰던 것을 한쪽으로 맞춤).
 *
 * @param team - 표시할 팀(TEAMS 레지스트리 항목)
 * @param selected - 선택 여부(accent 보더·체크 배지)
 * @param onSelect - 카드 클릭 콜백
 * @param className - 높이 등 화면별 변형 클래스
 */
export function TeamCrestCard({
  team,
  selected,
  onSelect,
  className = "",
}: {
  team: Team;
  selected: boolean;
  onSelect: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`bg-elevate-2 rounded-card focus-visible:outline-accent relative flex flex-col items-center justify-center gap-2.5 border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 active:opacity-80 ${
        selected ? "border-accent" : "border-border hover:border-border-strong"
      } ${className}`}
    >
      <TeamCrest team={team} size={40} />
      <span className="text-body text-text">{team.name}</span>
      {selected && (
        <span className="bg-accent text-on-accent absolute top-2.5 right-3 grid size-5.5 place-items-center rounded-full">
          <CheckIcon size={12} />
        </span>
      )}
    </button>
  );
}

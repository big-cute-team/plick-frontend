import { STAGE_META } from "@plick/domain/constants";
import type { RumorStage, Team } from "@plick/domain/types";
import { TeamCrest } from "@plick/ui/TeamCrest";

/** 단계 글자색 표시 스펙 — 칩(PostChips)의 글자색과 같은 매핑을 따른다. */
const STAGE_TEXT: Record<RumorStage, string> = {
  RUMOUR: "text-accent",
  IN_PROGRESS: "text-warn",
  OFFICIAL: "text-info",
};

/**
 * 릴 배지 줄 — 팀 로고 + 우측에 루머 단계 글자 (KAN-299).
 *
 * 텍스트 칩(PostChips) 대신 실제 구단 로고를 그리고, 단계는 알약 배경 없이
 * 로고 우측에 글자만 둔다. 기사 세부는 여전히 PostChips를 쓴다 — 릴 전용 표시다.
 *
 * @param team - 팀 레지스트리 항목. 태그된 팀이 없으면 null — 로고를 생략한다.
 * @param stage - 루머 단계. 없으면 글자를 생략한다.
 */
export function ReelBadges({
  team,
  stage,
}: {
  team: Team | null;
  stage: RumorStage | null;
}) {
  if (!team && !stage) return null;
  return (
    <div className="flex items-center gap-2">
      {team && <TeamCrest team={team} size={30} />}
      {stage && (
        <span
          className={`text-caption tracking-label font-extrabold whitespace-nowrap ${STAGE_TEXT[stage]}`}
        >
          {STAGE_META[stage].label}
        </span>
      )}
    </div>
  );
}

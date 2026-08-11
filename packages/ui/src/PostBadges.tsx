import { STAGE_LABEL, type PostStage } from "./PostChips";
import { TeamCrest } from "./TeamCrest";

/**
 * 단계 글자색 표시 스펙 — 칩(PostChips)의 글자색과 같은 매핑을 따른다.
 */
const STAGE_TEXT: Record<PostStage, string> = {
  RUMOUR: "text-accent",
  IN_PROGRESS: "text-warn",
  CONFIRMED: "text-confirmed",
  OFFICIAL: "text-info",
};

/**
 * 게시물 배지 줄 — 팀 로고 + 우측에 루머 단계 글자 (KAN-299).
 *
 * 텍스트 칩(PostChips) 대신 실제 구단 로고를 그리고, 단계는 알약 배경 없이
 * 로고 우측에 글자만 둔다. 모바일 릴(ReelItem) 전용이었다가 기사 세부(KAN-301)를
 * 거쳐 web 기사 세부도 같은 표시를 쓰게 되면서 `@plick/ui`로 승격했다(KAN-322).
 *
 * @param team - 팀 코드·이름. 태그된 팀이 없으면 null — 로고를 생략한다.
 * @param stage - 루머 단계. 없으면 글자를 생략한다.
 * @param crestSize - 로고 크기(px). 표면마다 스케일이 달라 앱이 정한다.
 * @param stageTextClass - 단계 글자 크기 유틸. 로고와 같은 이유로 앱이 정한다.
 */
export function PostBadges({
  team,
  stage,
  crestSize = 30,
  stageTextClass = "text-caption",
}: {
  team: { code: string; name: string } | null;
  stage?: PostStage | null;
  crestSize?: number;
  stageTextClass?: string;
}) {
  if (!team && !stage) return null;
  return (
    <div className="flex items-center gap-2">
      {team && <TeamCrest team={team} size={crestSize} />}
      {stage && (
        <span
          className={`${stageTextClass} tracking-label font-extrabold whitespace-nowrap ${STAGE_TEXT[stage]}`}
        >
          {STAGE_LABEL[stage]}
        </span>
      )}
    </div>
  );
}

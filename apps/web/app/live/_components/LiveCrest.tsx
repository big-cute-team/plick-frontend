import { TEAMS } from "@plick/domain/constants";
import type { LiveTeam } from "@plick/domain/live";
import { TeamCrest } from "@plick/ui/TeamCrest";

/**
 * 라이브 화면의 팀 표식 — 빅6는 로컬 크레스트, 빅6 밖은 축약 코드 제네릭
 * 원형(모바일 `live/_components/LiveCrest`와 같은 규약). 라이브 지면 전체가
 * 웹·모바일 동시 사용이 확정되면 `@plick/ui` 승격을 ADR 0011 게이트로
 * 판단한다 — 껍데기 단계는 레이아웃이 흔들릴 수 있어 앱별로 둔다.
 */
export function LiveCrest({
  team,
  size = 24,
  className = "",
}: {
  team: LiveTeam;
  size?: number;
  className?: string;
}) {
  if (team.code) {
    return (
      <TeamCrest team={TEAMS[team.code]} size={size} className={className} />
    );
  }
  return (
    <span
      aria-label={team.name}
      className={`bg-elevate text-text-4 grid shrink-0 place-items-center rounded-full font-bold ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(7, size * 0.3) }}
    >
      {team.shortName.slice(0, 3)}
    </span>
  );
}

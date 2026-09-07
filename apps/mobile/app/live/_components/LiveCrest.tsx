import { TEAMS } from "@plick/domain/constants";
import type { LiveTeam } from "@plick/domain/live";
import { TeamCrest } from "@plick/ui/TeamCrest";

/**
 * 라이브 화면의 팀 표식 — 빅6는 로컬 크레스트, 빅6 밖은 축약 코드를 넣은
 * 제네릭 원형이다(디자인의 이니셜 폴백). 실배선 때 API-Football CDN 로고를
 * 붙이면 제네릭은 로드 실패 폴백으로 남는다(ADR 0126).
 *
 * @param team - 경기·순위 데이터의 팀 참조
 * @param size - 한 변 px (기본 24)
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

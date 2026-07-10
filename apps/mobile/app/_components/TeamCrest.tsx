import { TEAMS } from "@/_lib/constants";
import type { TeamCode } from "@/_lib/types";

/**
 * 팀 크레스트 — `public/teams/<code>.webp`의 실제 구단 로고를 그린다.
 *
 * 로고 원본 비율이 팀마다 달라(세로형 등) 정사각 박스에 `object-contain`으로 담는다.
 *
 * @param team - 팀 코드 (예: `"LIV"`)
 * @param size - 렌더 크기(px, 정사각형)
 */
export function TeamCrest({
  team,
  size = 40,
  className = "",
}: {
  team: TeamCode;
  size?: number;
  className?: string;
}) {
  return (
    /* 로고는 수십 KB 정적 에셋이라 next/image 최적화 없이 그대로 서빙한다 */
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/teams/${team.toLowerCase()}.webp`}
      alt={TEAMS[team].name}
      width={size}
      height={size}
      /* Tailwind preflight(img { height:auto })가 height 속성을 무시해 인라인으로 고정 */
      style={{ width: size, height: size }}
      className={`object-contain ${className}`}
    />
  );
}

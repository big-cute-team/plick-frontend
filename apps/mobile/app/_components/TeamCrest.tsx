import { TEAMS } from "../_lib/constants";
import type { TeamCode } from "../_lib/types";

/**
 * 코드 생성 팀 크레스트(방패 + 약자) — 이미지 에셋 없이 팀 컬러 토큰으로 채운다.
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
  const colorVar = TEAMS[team].colorVar;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={className}
      role="img"
      aria-label={TEAMS[team].name}
    >
      <path
        d="M20 2 34 6v14c0 9-6 15-14 18C12 35 6 29 6 20V6z"
        style={{ fill: `var(${colorVar})` }}
      />
      <path
        d="M20 2 34 6v14c0 9-6 15-14 18C12 35 6 29 6 20V6z"
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="1"
      />
      <text
        x="20"
        y="23"
        textAnchor="middle"
        fontSize="11"
        fontWeight="800"
        fill="#fff"
        style={{ letterSpacing: "0.5px" }}
      >
        {team}
      </text>
    </svg>
  );
}

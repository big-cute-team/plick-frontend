import type { CSSProperties, ReactNode } from "react";
import { TEAMS } from "@/_lib/constants";
import type { TeamCode } from "@/_lib/types";

/**
 * 사진 자리 placeholder — 팀 컬러에서 미디어 배경 토큰으로 흐르는 그라데이션.
 *
 * 색은 전부 토큰(CSS 변수) 기반이며, BE 연동 시 `<img>`로 교체한다.
 *
 * @param team - 그라데이션 시작색을 정하는 팀 코드
 * @param children - 미디어 위에 얹을 오버레이(스크림·텍스트 등)
 */
export function MediaThumb({
  team,
  className = "",
  children,
  style,
}: {
  team: TeamCode;
  className?: string;
  children?: ReactNode;
  style?: CSSProperties;
}) {
  const colorVar = TEAMS[team].colorVar;
  return (
    <div
      className={`bg-media relative overflow-hidden ${className}`}
      style={{
        backgroundImage: `linear-gradient(155deg, color-mix(in oklab, var(${colorVar}) 62%, #05070c) 0%, var(--plk-media-bg) 78%)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

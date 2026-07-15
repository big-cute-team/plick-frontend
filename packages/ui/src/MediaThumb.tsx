import type { CSSProperties, ReactNode } from "react";

/**
 * 사진 자리 placeholder — 팀 컬러에서 미디어 배경 토큰으로 흐르는 그라데이션.
 *
 * 색은 전부 토큰(CSS 변수) 기반이며, BE 연동 시 `<img>`로 교체한다.
 *
 * @param colorVar - 그라데이션 시작색 CSS 변수명 (예: `--plk-team-liv`).
 *   각 앱의 팀 레지스트리(TEAMS)에서 `colorVar`를 꺼내 넘긴다.
 * @param children - 미디어 위에 얹을 오버레이(스크림·텍스트 등)
 */
export function MediaThumb({
  colorVar,
  className = "",
  children,
  style,
}: {
  colorVar: string;
  className?: string;
  children?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`bg-media relative overflow-hidden ${className}`}
      style={{
        backgroundImage: `linear-gradient(155deg, color-mix(in oklab, var(${colorVar}) 62%, var(--plk-scrim)) 0%, var(--plk-media-bg) 78%)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

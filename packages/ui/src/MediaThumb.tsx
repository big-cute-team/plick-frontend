import type { CSSProperties, ReactNode } from "react";

/**
 * 사진 자리 — 이미지가 있으면 그리고, 없으면 팀 컬러에서 미디어 배경 토큰으로
 * 흐르는 그라데이션 placeholder로 폴백한다 (KAN-284).
 *
 * 그라데이션은 이미지가 있어도 뒤에 깔려 로딩 중 배경 역할을 한다.
 * 색은 전부 토큰(CSS 변수) 기반이다.
 *
 * @param colorVar - 그라데이션 시작색 CSS 변수명 (예: `--plk-team-liv`).
 *   각 앱의 팀 레지스트리(TEAMS)에서 `colorVar`를 꺼내 넘긴다.
 * @param imageUrl - 실제 사진 URL. null/생략이면 그라데이션만 남는다.
 *   호스트가 유동이라 next/image 대신 일반 img로 그린다.
 * @param children - 미디어 위에 얹을 오버레이(스크림·텍스트 등)
 */
export function MediaThumb({
  colorVar,
  imageUrl,
  className = "",
  children,
  style,
}: {
  colorVar: string;
  imageUrl?: string | null;
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
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          className="absolute inset-0 size-full object-cover"
        />
      )}
      {children}
    </div>
  );
}

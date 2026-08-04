import type { ReactNode } from "react";

/**
 * 하단 고정 액션 영역 — 피그마 하단 여백을 지키되, 홈 인디케이터가 그보다 두꺼운
 * 기기에선 `safe-area + 24px`로 띄운다. 온보딩 CTA·인증 버튼 묶음 공용.
 *
 * @param base - 피그마 기준 하단 여백(px). 온보딩 56, 인증 화면 64.
 * @param className - 래퍼 section에 덧붙일 클래스(버튼 스택 배치 등)
 */
export function BottomActionBar({
  base = 56,
  className = "",
  children,
}: {
  base?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`px-edge ${className}`}
      style={{
        paddingBottom: `max(${base}px, var(--safe-bottom) + 24px)`,
      }}
    >
      {children}
    </section>
  );
}

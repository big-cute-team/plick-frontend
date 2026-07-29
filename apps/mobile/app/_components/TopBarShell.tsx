import type { ReactNode } from "react";

/**
 * 상단바 공통 껍데기 — safe-area pt + `h-13 px-edge` 행.
 *
 * 크롬(보더·배경)과 행 배치(가운데 타이틀·양끝 정렬)는 화면마다 달라
 * 껍데기만 공용화한다. TopBar·EditTopBar·OnboardingTopBar·회원가입 상단이 사용.
 *
 * @param className - header에 더할 크롬 (예: `border-b bg-nav/90`)
 * @param innerClassName - 내부 행에 더할 배치 (예: `justify-between`, `relative`)
 */
export function TopBarShell({
  className = "",
  innerClassName = "",
  children,
}: {
  className?: string;
  innerClassName?: string;
  children: ReactNode;
}) {
  return (
    <header
      className={`shrink-0 ${className}`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className={`px-edge flex h-13 items-center ${innerClassName}`}>
        {children}
      </div>
    </header>
  );
}

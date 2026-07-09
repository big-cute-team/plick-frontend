import type { ReactNode } from "react";

/**
 * 상/하단 바 사이의 스크롤 영역.
 *
 * `overscroll-contain`으로 스크롤 바운스가 부모(웹뷰)로 전파되지 않게 막는다.
 */
export function ScrollArea({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main
      className={`no-scrollbar flex-1 overflow-y-auto overscroll-contain ${className}`}
    >
      {children}
    </main>
  );
}

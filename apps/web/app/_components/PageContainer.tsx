import type { ReactNode } from "react";

/**
 * 데스크톱 콘텐츠 컨테이너 — 최대폭(max-w-page, 1200px) + 중앙 정렬 + 좌우 거터.
 *
 * 페이지마다 max-width를 따로 적지 않고 이 컴포넌트 하나로 폭을 통일한다.
 *
 * @param className - 컨테이너에 추가할 클래스 (상하 패딩·flex 등)
 */
export function PageContainer({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`max-w-page px-gutter mx-auto w-full ${className}`}>
      {children}
    </div>
  );
}

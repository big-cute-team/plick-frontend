import type { ReactNode } from "react";

/**
 * 데스크톱 콘텐츠 컨테이너 — 최대폭(max-w-page, 1280px) + 중앙 정렬 + 좌우 거터
 * (px-gutter, 28px). 시안(KAN-567) 아트보드 폭이다.
 *
 * 페이지마다 max-width를 따로 적지 않고 이 컴포넌트 하나로 폭을 통일한다.
 * 홈·기사 세부처럼 본문 + 우측 레일 2열이면 `grid` 클래스를 여기 얹는다.
 *
 * @param className - 컨테이너에 추가할 클래스 (상하 패딩·grid 등)
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

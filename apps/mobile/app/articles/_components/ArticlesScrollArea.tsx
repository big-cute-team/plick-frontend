"use client";

import type { ReactNode } from "react";
import { ScrollArea } from "@/_components/ScrollArea";
import { useArticlesRefresh } from "@/_hooks/useArticlesRefresh";

/**
 * 기사 페이지의 스크롤 영역 (KAN-386) — 위치 복원과 당겨서 새로고침을 얹은
 * 껍데기. `HomeScrollArea`와 같은 구조인 이유도 같다: 서버 컴포넌트는 클라
 * 컴포넌트에 함수(`onRefresh`)를 넘길 수 없어 갱신 동작을 아는 클라 경계를
 * 하나 두고, 그 안에서 훅으로 만들어 넘긴다. `children`은 서버에서 렌더된
 * 채로 이 경계를 그냥 통과한다.
 */
export function ArticlesScrollArea({ children }: { children: ReactNode }) {
  const refresh = useArticlesRefresh();

  return (
    <ScrollArea
      className="pb-section"
      restoreKey="articles"
      onRefresh={refresh}
    >
      {children}
    </ScrollArea>
  );
}

"use client";

import type { ReactNode } from "react";
import { ScrollArea } from "@/_components/ScrollArea";
import { useDebatesRefresh } from "@/_hooks/useDebatesRefresh";

/**
 * 토론 리스트의 스크롤 영역 (KAN-418) — 위치 복원과 당겨서 새로고침을 얹은
 * 껍데기. 클라 경계를 따로 두는 이유는 `ArticlesScrollArea`와 같다: 서버
 * 컴포넌트는 클라 컴포넌트에 함수(`onRefresh`)를 넘길 수 없다.
 */
export function DebatesScrollArea({ children }: { children: ReactNode }) {
  const refresh = useDebatesRefresh();

  return (
    <ScrollArea className="pb-section" restoreKey="debate" onRefresh={refresh}>
      {children}
    </ScrollArea>
  );
}

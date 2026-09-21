"use client";

import type { ReactNode } from "react";
import { ScrollArea } from "@/_components/ScrollArea";
import { useActivityRefresh } from "@/_hooks/useActivityRefresh";

/**
 * 활동 화면의 스크롤 영역 (KAN-495). 위치 복원과 당겨서 새로고침을 얹은 껍데기.
 * `ArticlesScrollArea`와 같은 구조인 이유도 같다. 서버 컴포넌트는 클라
 * 컴포넌트에 함수(`onRefresh`)를 넘길 수 없어 갱신 동작을 아는 클라 경계를
 * 하나 두고, 그 안에서 훅으로 만들어 넘긴다.
 *
 * 위치 복원(`restoreKey`)을 두는 이유는 기사 페이지와 같다. 목록에서 기사로
 * 들어갔다 뒤로 나오면 보던 자리로 돌아와야 한다.
 */
export function ActivityScrollArea({ children }: { children: ReactNode }) {
  const refresh = useActivityRefresh();

  return (
    <ScrollArea
      className="pb-section"
      restoreKey="activity"
      onRefresh={refresh}
    >
      {children}
    </ScrollArea>
  );
}

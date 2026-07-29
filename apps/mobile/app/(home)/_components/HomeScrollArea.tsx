"use client";

import type { ReactNode } from "react";
import { ScrollArea } from "@/_components/ScrollArea";
import { useHomeRefresh } from "@/_hooks/useHomeRefresh";

/**
 * 홈의 스크롤 영역 (KAN-314) — 위치 복원과 당겨서 새로고침을 얹은 껍데기.
 *
 * 페이지가 `ScrollArea`를 직접 쓰지 않고 이걸 거치는 이유는 `onRefresh`가 함수라서다.
 * 서버 컴포넌트는 클라 컴포넌트에 함수를 넘길 수 없다(직렬화되지 않는다). 그래서
 * 갱신 동작을 아는 클라 경계를 하나 두고, 그 안에서 훅으로 만들어 넘긴다.
 * `children`은 서버에서 렌더된 채로 이 경계를 그냥 통과한다.
 */
export function HomeScrollArea({ children }: { children: ReactNode }) {
  const refresh = useHomeRefresh();

  return (
    <ScrollArea className="pb-section" restoreKey="home" onRefresh={refresh}>
      {children}
    </ScrollArea>
  );
}

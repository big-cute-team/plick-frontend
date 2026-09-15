"use client";

import type { ReactNode } from "react";
import { ScrollArea } from "@/_components/ScrollArea";
import { useLiveRefresh } from "@/_hooks/useLiveRefresh";
import { useServerRefresh } from "@/_hooks/useServerRefresh";

/**
 * LIVE 탭의 스크롤 영역 (KAN-462) — 당겨서 새로고침을 얹은 껍데기. 홈의
 * `HomeScrollArea`와 같은 이유로 존재한다: 서버 컴포넌트는 클라 컴포넌트에
 * 함수(`onRefresh`)를 넘길 수 없어, 갱신 동작을 아는 클라 경계를 하나 두고
 * 안에서 훅으로 만들어 넘긴다. `children`은 서버에서 렌더된 채로 지나간다.
 *
 * 갱신 대상은 라우트마다 다르다. 경기 목록은 그 날짜의 쿼리를 다시 받고,
 * 순위표는 서버 컴포넌트가 그리므로 서버 갱신을 기다린다.
 *
 * @param date 경기 목록이면 보고 있는 날짜 키, 순위표면 없음
 */
export function LiveScrollArea({
  date,
  children,
}: {
  date?: string;
  children: ReactNode;
}) {
  const refreshMatches = useLiveRefresh(date);
  const refreshServer = useServerRefresh();

  return (
    <ScrollArea onRefresh={date ? refreshMatches : refreshServer}>
      {children}
    </ScrollArea>
  );
}

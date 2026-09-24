"use client";

import type { ReactNode } from "react";
import { ScrollArea } from "@/_components/ScrollArea";
import { useLiveRefresh } from "@/_hooks/useLiveRefresh";
import { useServerRefresh } from "@/_hooks/useServerRefresh";

/**
 * LIVE 탭의 스크롤 영역 (KAN-462). 당겨서 새로고침을 얹은 껍데기. 홈의
 * `HomeScrollArea`와 같은 이유로 존재한다: 서버 컴포넌트는 클라 컴포넌트에
 * 함수(`onRefresh`)를 넘길 수 없어, 갱신 동작을 아는 클라 경계를 하나 두고
 * 안에서 훅으로 만들어 넘긴다. `children`은 서버에서 렌더된 채로 지나간다.
 *
 * 경기 목록 화면은 둘을 같이 갱신한다 (KAN-567). 목록은 그 날짜의 쿼리를 다시
 * 받고, 같은 지면 아래 붙은 순위표는 서버 컴포넌트가 그리므로 서버 갱신도 함께
 * 기다린다. 순위표 라우트는 서버 갱신만이다.
 *
 * @param date 경기 목록이면 보고 있는 날짜 키, 순위표면 없음
 * @param contentClassName 콘텐츠 래퍼에 더할 클래스. 경기 목록이 화면 끝까지
 *   높이를 차지하려고 쓴다({@link ScrollArea} 참고)
 */
export function LiveScrollArea({
  date,
  contentClassName,
  children,
}: {
  date?: string;
  contentClassName?: string;
  children: ReactNode;
}) {
  const refreshMatches = useLiveRefresh(date);
  const refreshServer = useServerRefresh();

  return (
    <ScrollArea
      onRefresh={
        date
          ? () => Promise.all([refreshMatches(), refreshServer()])
          : refreshServer
      }
      contentClassName={contentClassName}
    >
      {children}
    </ScrollArea>
  );
}

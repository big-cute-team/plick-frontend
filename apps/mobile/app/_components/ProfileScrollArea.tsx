"use client";

import type { ReactNode } from "react";
import type { QueryKey } from "@tanstack/react-query";
import { ScrollArea } from "@/_components/ScrollArea";
import { useProfileRefresh } from "@/_hooks/useProfileRefresh";

/**
 * 프로필 화면(팀·선수·인물)의 스크롤 영역 (KAN-681). 당겨서 새로고침을 얹은 껍데기.
 * `HomeScrollArea`와 같은 구조인 이유도 같다. 서버 컴포넌트는 클라 컴포넌트에
 * 함수(`onRefresh`)를 넘길 수 없어 갱신 동작을 아는 클라 경계를 하나 두고, 그
 * 안에서 훅으로 만들어 넘긴다. 쿼리키는 문자열 배열이라 서버에서 넘길 수 있다.
 *
 * @param feedKey 함께 다시 받을 무한 목록의 쿼리키(인물 프로필의 관련 기사). 없으면 서버 갱신만
 */
export function ProfileScrollArea({
  feedKey,
  children,
}: {
  feedKey?: QueryKey;
  children: ReactNode;
}) {
  const refresh = useProfileRefresh(feedKey);

  return (
    <ScrollArea className="pb-section" onRefresh={refresh}>
      {children}
    </ScrollArea>
  );
}

"use client";

import { useCallback } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { restartFeedQuery } from "@plick/core/feed-refresh";
import { useServerRefresh } from "@/_hooks/useServerRefresh";

/**
 * 프로필 화면(팀·선수·인물)을 다시 받는다 (KAN-681). 맨 위에서 당겼을 때 도는 동작.
 *
 * 프로필은 서버 컴포넌트가 그리는 지면이라 `router.refresh()`로 RSC 페이로드를 다시
 * 받는다. 인물 프로필처럼 아래에 무한 목록 쿼리가 붙은 화면은 그 피드도 첫 페이지로
 * 줄여 다시 받는다(`restartFeedQuery`). 서버 쪽은 60초 ISR이라 그 주기 안에서는 같은
 * 스냅샷이 올 수 있다.
 *
 * @param feedKey 함께 다시 받을 무한 목록의 쿼리키. 없으면 서버 갱신만 한다
 */
export function useProfileRefresh(feedKey?: QueryKey) {
  const queryClient = useQueryClient();
  const refreshServer = useServerRefresh();

  return useCallback(
    () =>
      Promise.all([
        feedKey ? restartFeedQuery(queryClient, feedKey) : Promise.resolve(),
        refreshServer(),
      ]),
    [queryClient, refreshServer, feedKey],
  );
}

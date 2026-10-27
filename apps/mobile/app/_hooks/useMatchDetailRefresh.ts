"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { liveKeys } from "@plick/core/liveKeys";

/**
 * 경기 상세를 다시 받는다 (KAN-681). 상세 화면 맨 위에서 당겼을 때 도는 동작.
 *
 * 화면은 전부 `useMatchDetail` 쿼리가 들고 있으므로 그 경기의 쿼리만 refetch하면
 * 된다. 라이브 중에는 20초 폴링이 돌지만 예정·종료 경기는 폴링이 꺼져 있어, 라인업이
 * 늦게 뜨거나 종료 직후 스탯이 바뀐 걸 보려면 이 손동작이 유일한 통로다.
 * `refetchQueries`는 캐시를 비우지 않아 보던 화면이 그대로 있다가 새 값으로 바뀐다.
 *
 * @param matchId API-Football fixture id
 */
export function useMatchDetailRefresh(matchId: number) {
  const queryClient = useQueryClient();

  return useCallback(
    () => queryClient.refetchQueries({ queryKey: liveKeys.match(matchId) }),
    [queryClient, matchId],
  );
}

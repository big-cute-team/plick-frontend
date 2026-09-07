"use client";

import { useQuery } from "@tanstack/react-query";
import { getMatchDetail } from "@plick/core/live";
import { liveKeys } from "@plick/core/liveKeys";
import type { InitialMatchDetail, MatchDetail } from "@plick/domain/live";
import { LIVE_MAX_RETRIES, LIVE_POLL_MS } from "@/_constants/live";

/**
 * 경기 상세 쿼리 (KAN-452) — 서버 씨앗을 심고 `header.status`가 LIVE일 때만
 * 20초 폴링한다. 모바일 `useMatchDetail`의 웹 이식(`useQuery` 분기형).
 */
export function useMatchDetail(matchId: number, initial?: InitialMatchDetail) {
  return useQuery<MatchDetail>({
    queryKey: liveKeys.match(matchId),
    queryFn: () => getMatchDetail(matchId),
    staleTime: LIVE_POLL_MS,
    retry: LIVE_MAX_RETRIES,
    refetchInterval: (query) =>
      query.state.data?.header.status === "LIVE" ? LIVE_POLL_MS : false,
    ...(initial && {
      initialData: initial.detail,
      initialDataUpdatedAt: initial.fetchedAt,
    }),
  });
}

"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { getMatchDetail } from "@plick/core/live";
import { liveKeys } from "@plick/core/liveKeys";
import type { InitialMatchDetail, MatchDetail } from "@plick/domain/live";
import { LIVE_MAX_RETRIES, LIVE_POLL_MS } from "@/_constants/live";

/**
 * 경기 상세 쿼리 (KAN-452) — 서버 씨앗을 심고 라이브 중에만 20초 폴링한다.
 * `header.status`가 LIVE가 아니면(예정·종료·연기) 폴링을 끈다. suspense 훅이라
 * 실패는 QueryBoundary가 받는다(KAN-447).
 *
 * @param matchId API-Football fixture id
 * @param initial 서버 컴포넌트가 받아 둔 상세와 그 시각
 */
export function useMatchDetail(matchId: number, initial?: InitialMatchDetail) {
  return useSuspenseQuery<MatchDetail>({
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

"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { getMatches } from "@plick/core/live";
import { liveKeys } from "@plick/core/liveKeys";
import { hasLiveMatch } from "@plick/domain/live";
import type { InitialMatchList, MatchSummary } from "@plick/domain/live";
import { LIVE_MAX_RETRIES, LIVE_POLL_MS } from "@/_constants/live";

/**
 * 날짜별 경기 목록 쿼리 (KAN-452) — 서버 씨앗을 심고 이후 갱신은 클라가 맡는다.
 *
 * suspense 훅이다(KAN-447 규약) — 씨앗이 있으면 즉시 그리고, 서버 fetch가
 * 실패해 씨앗 없이 들어오면 받는 동안 suspend, 실패하면 throw로 QueryBoundary에
 * 잡힌다.
 *
 * 폴링은 조건부다. 응답에 LIVE 경기가 하나라도 있을 때만 20초마다 다시 받고,
 * 예정·종료뿐인 날은 헛폴링하지 않는다(ADR 0126). 탭을 떠나 있는 동안은
 * TanStack 기본값대로 멈춘다.
 *
 * @param date "YYYY-MM-DD" (페이지가 검증해 넘긴다)
 * @param initial 서버 컴포넌트가 받아 둔 목록과 그 시각. 서버 fetch가 실패했으면 없이 들어온다.
 */
export function useMatches(date: string, initial?: InitialMatchList) {
  return useSuspenseQuery<MatchSummary[]>({
    queryKey: liveKeys.matches(date),
    queryFn: () => getMatches(date),
    staleTime: LIVE_POLL_MS,
    retry: LIVE_MAX_RETRIES,
    refetchInterval: (query) =>
      hasLiveMatch(query.state.data) ? LIVE_POLL_MS : false,
    ...(initial && {
      initialData: initial.items,
      initialDataUpdatedAt: initial.fetchedAt,
    }),
  });
}

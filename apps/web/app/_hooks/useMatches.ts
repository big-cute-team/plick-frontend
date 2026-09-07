"use client";

import { useQuery } from "@tanstack/react-query";
import { getMatches } from "@plick/core/live";
import { liveKeys } from "@plick/core/liveKeys";
import { hasLiveMatch } from "@plick/domain/live";
import type { InitialMatchList, MatchSummary } from "@plick/domain/live";
import { LIVE_MAX_RETRIES, LIVE_POLL_MS } from "@/_constants/live";

/**
 * 날짜별 경기 목록 쿼리 (KAN-452) — 모바일 `useMatches`의 웹 이식. 서버 씨앗을
 * 심고 이후 갱신은 클라가 맡는다. 폴링은 응답에 LIVE 경기가 있을 때만 20초.
 * 웹은 에러 경계 인프라가 없어 suspense 훅이 아니라 `isPending`·`isError`
 * 분기다(토론 리스트와 같은 관례).
 *
 * @param date "YYYY-MM-DD" (페이지가 검증해 넘긴다)
 * @param initial 서버가 받아 둔 목록 씨앗. 서버 fetch가 실패했으면 없이 들어온다
 */
export function useMatches(date: string, initial?: InitialMatchList) {
  return useQuery<MatchSummary[]>({
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

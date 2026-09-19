"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { ApiError } from "@plick/core/client";
import { articleKeys } from "@plick/core/articleKeys";
import { getArticles } from "@plick/core/articles";
import type { InitialArticleFeed } from "@plick/domain/types";
import { FEED_FRESH_MS, FEED_MAX_RETRIES } from "@/_constants/feed";

/**
 * 인물 관련 기사 무한 목록 (KAN-500). 인물 프로필 아래에서 그 인물이 태그된
 * 기사를 최신순 커서 페이지로 이어 받는다.
 *
 * 팀 피드 훅(`useArticleFeed`)과 같은 규약이다 — 서버가 받은 첫 페이지를
 * 씨앗으로 심고, `nextCursor`가 null이면 마지막 페이지, 4xx는 재시도하지
 * 않는다. 인물마다 쿼리키가 달라 다른 인물로 넘어가면 새로 받고, 봤던 인물로
 * 돌아오면 신선한 동안 캐시를 그대로 쓴다.
 *
 * @param figureId 인물 id
 * @param initial 서버 컴포넌트가 미리 받아 둔 첫 페이지와 그 시각
 */
export function useFigureArticles(
  figureId: string,
  initial?: InitialArticleFeed,
) {
  return useInfiniteQuery({
    queryKey: articleKeys.figureFeed(figureId),
    queryFn: ({ pageParam }) => getArticles({ figureId, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialData: initial
      ? { pages: [initial.page], pageParams: [null] }
      : undefined,
    // 씨앗의 신선도는 서버가 받은 시각이다. 기기 시계가 뒤처져 미래로 보이면 지금으로 깎는다
    initialDataUpdatedAt: initial
      ? () => Math.min(initial.fetchedAt, Date.now())
      : undefined,
    staleTime: FEED_FRESH_MS,
    gcTime: FEED_FRESH_MS,
    refetchOnWindowFocus: false,
    // 목록 자리에 상태 분기로 에러를 그리므로 경계로 던지지 않는다
    throwOnError: false,
    retry: (failureCount, error) => {
      if (
        error instanceof ApiError &&
        error.status >= 400 &&
        error.status < 500
      ) {
        return false;
      }
      return failureCount < FEED_MAX_RETRIES;
    },
  });
}

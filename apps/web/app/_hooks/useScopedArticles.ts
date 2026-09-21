"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { getArticles } from "@plick/core/articles";
import { ApiError } from "@plick/core/client";
import type { InitialArticleFeed } from "@plick/domain/types";
import { FEED_FRESH_MS, FEED_MAX_RETRIES } from "@/_constants/feed";
import type { ArticleScope } from "@/_types/articles";
import { scopedArticlesKey } from "@/_utils/articles";

/**
 * 범위(인물·이슈)로 거른 기사 무한 목록 (KAN-500, web 이식 KAN-501, 이슈 추가
 * KAN-523). 인물 프로필 전용 `useFigureArticles`였는데 이슈 상세가 같은 피드에
 * 필터만 바꿔 쓰게 되면서 범위를 받게 넓혔다. 모바일 `useFigureArticles`와는
 * 앱별로 둔다(`useArticleFeed`와 같은 판단).
 *
 * 팀 피드 훅과 같은 규약이다 — 서버가 받은 첫 페이지를 씨앗으로 심고,
 * `nextCursor`가 null이면 마지막 페이지, 4xx는 재시도하지 않는다. 범위마다
 * 쿼리키가 달라 다른 인물·이슈로 넘어가면 새로 받고, 봤던 곳으로 돌아오면
 * 신선한 동안 캐시를 그대로 쓴다.
 *
 * @param scope 무엇으로 거를지
 * @param initial 서버 컴포넌트가 미리 받아 둔 첫 페이지와 그 시각
 */
export function useScopedArticles(
  scope: ArticleScope,
  initial?: InitialArticleFeed,
) {
  return useInfiniteQuery({
    queryKey: scopedArticlesKey(scope),
    queryFn: ({ pageParam }) =>
      getArticles(
        scope.kind === "figure"
          ? { figureId: scope.id, cursor: pageParam }
          : { storyId: scope.id, cursor: pageParam },
      ),
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

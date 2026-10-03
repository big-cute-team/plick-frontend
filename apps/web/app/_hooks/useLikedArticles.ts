"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { activityKeys } from "@plick/core/activityKeys";
import { ApiError } from "@plick/core/client";
import type { InitialArticleFeed } from "@plick/domain/types";
import { FEED_FRESH_MS, FEED_MAX_RETRIES } from "@/_constants/feed";
import { useFreshSeed } from "@/_hooks/useFreshSeed";
import { getLikedArticles } from "@/_services/activity";

/**
 * 내가 좋아요한 기사 목록 (KAN-495 모바일 → KAN-567 웹 이식). 마이페이지 내 활동의
 * 좋아요 탭.
 *
 * 기사 피드(`useArticleFeed`)와 같은 커서 규약, 캐시 정책이다. `nextCursor`가
 * null인지로만 끝을 판단하고, 4xx는 다시 보내도 같은 답이라 재시도하지 않는다.
 *
 * 다른 점은 씨앗을 우선한다는 것이다(`useFreshSeed`). 세부에서 하트를 끈 카드는
 * `syncLikeIntoFeeds`가 이 캐시의 `liked`를 false로 바꿔 두므로 화면이 걸러 내면
 * 되지만, 다른 화면에서 새로 누른 기사는 캐시에 없어 서버가 새로 받은 첫
 * 페이지로 갈아 끼워야 보인다.
 *
 * @param initial 서버 컴포넌트가 미리 받아 둔 첫 페이지와 그 시각. 좋아요 탭을
 *   보고 있을 때만 있다
 */
export function useLikedArticles(initial?: InitialArticleFeed) {
  useFreshSeed(
    activityKeys.likes(),
    initial && {
      data: { pages: [initial.page], pageParams: [null] },
      fetchedAt: initial.fetchedAt,
    },
  );

  return useInfiniteQuery({
    queryKey: activityKeys.likes(),
    queryFn: ({ pageParam }) => getLikedArticles({ cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialData: initial
      ? { pages: [initial.page], pageParams: [null] }
      : undefined,
    // 씨앗의 신선도를 서버가 받은 시각으로 못박는다 (useArticleFeed와 같은 이유)
    initialDataUpdatedAt: initial
      ? () => Math.min(initial.fetchedAt, Date.now())
      : undefined,
    staleTime: FEED_FRESH_MS,
    gcTime: FEED_FRESH_MS,
    refetchOnWindowFocus: false,
    // 목록 자리에서 상태 분기로 에러를 그린다 (전역 throwOnError 기본을 끈다)
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

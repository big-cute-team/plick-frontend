"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { activityKeys } from "@plick/core/activityKeys";
import { ApiError } from "@plick/core/client";
import { FEED_FRESH_MS, FEED_MAX_RETRIES } from "@/_constants/feed";
import { useFreshSeed } from "@/_hooks/useFreshSeed";
import { getMyComments } from "@/_services/activity";
import type { MyCommentPage } from "@/_types/activity";

/**
 * 내가 쓴 댓글 목록 (KAN-495 모바일 → KAN-567 웹 이식). 마이페이지 내 활동의 댓글 탭.
 *
 * 커서 규약, 캐시 정책, 씨앗 우선은 {@link useLikedArticles}와 같다. 세부에서 댓글을
 * 지우면 `useDeleteComment`가 이 캐시에서 그 줄을 빼고, 새로 쓰면
 * `useCreateComment`가 첫 페이지만 남기고 stale로 표시해 다음 마운트 때 첫
 * 페이지를 다시 받는다.
 *
 * @param initial 서버 컴포넌트가 미리 받아 둔 첫 페이지와 그 시각. 댓글 탭을
 *   보고 있을 때만 있다
 */
export function useMyComments(initial?: {
  page: MyCommentPage;
  fetchedAt: number;
}) {
  useFreshSeed(
    activityKeys.comments(),
    initial && {
      data: { pages: [initial.page], pageParams: [null] },
      fetchedAt: initial.fetchedAt,
    },
  );

  return useInfiniteQuery({
    queryKey: activityKeys.comments(),
    queryFn: ({ pageParam }) => getMyComments({ cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialData: initial
      ? { pages: [initial.page], pageParams: [null] }
      : undefined,
    initialDataUpdatedAt: initial
      ? () => Math.min(initial.fetchedAt, Date.now())
      : undefined,
    staleTime: FEED_FRESH_MS,
    gcTime: FEED_FRESH_MS,
    refetchOnWindowFocus: false,
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

"use client";

import { useQuery } from "@tanstack/react-query";
import { activityKeys } from "@plick/core/activityKeys";
import { ApiError } from "@plick/core/client";
import { FEED_FRESH_MS, FEED_MAX_RETRIES } from "@/_constants/feed";
import { useFreshSeed } from "@/_hooks/useFreshSeed";
import { getMyActivityCounts } from "@/_services/activity";
import type { MyActivityCounts } from "@/_types/activity";

/**
 * 활동 개수 (KAN-495). 활동 화면의 탭 라벨 옆 숫자.
 *
 * 목록과 같은 30분 캐시지만 셋을 갱신 신호로 받는다. 좋아요 토글
 * (`syncLikeIntoFeeds`)과 댓글 작성·삭제가 이 키를 stale로 표시해 두므로, 그 뒤
 * 활동 화면에 돌아오면 마운트 때 다시 센다. 값 하나짜리 요청이라 무한 쿼리처럼
 * 페이지를 줄줄이 다시 받을 걱정이 없다.
 *
 * 마운트 뒤 씨앗 우선(`useFreshSeed`)은 목록과 같은 이유다.
 *
 * @param initial 서버 컴포넌트가 미리 받아 둔 개수와 그 시각
 */
export function useMyActivityCounts(initial?: {
  counts: MyActivityCounts;
  fetchedAt: number;
}) {
  useFreshSeed(
    activityKeys.counts(),
    initial && { data: initial.counts, fetchedAt: initial.fetchedAt },
  );

  return useQuery({
    queryKey: activityKeys.counts(),
    queryFn: () => getMyActivityCounts(),
    initialData: initial?.counts,
    initialDataUpdatedAt: initial
      ? () => Math.min(initial.fetchedAt, Date.now())
      : undefined,
    staleTime: FEED_FRESH_MS,
    gcTime: FEED_FRESH_MS,
    refetchOnWindowFocus: false,
    // 숫자가 없으면 라벨만 그린다. 목록이 에러를 대신 알린다
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

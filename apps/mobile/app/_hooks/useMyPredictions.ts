"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { ApiError } from "@plick/core/client";
import { predictionKeys } from "@plick/core/predictionKeys";
import { getMyPredictions } from "@plick/core/predictions";
import type { MyPredictionPage } from "@plick/domain/prediction";
import { FEED_FRESH_MS, FEED_MAX_RETRIES } from "@/_constants/feed";
import { useFreshSeed } from "@/_hooks/useFreshSeed";

/**
 * 내 예측 기록 무한 쿼리 (KAN-702, 시안 가이드 §5.8·§8). MY 활동의 예측 탭이 쓴다. 순서는 서버가 준
 * 그대로다(결과 대기 먼저, 그다음 킥오프 역순).
 *
 * `GET /me/predictions`는 토큰이 없으면 401이라 소셜 계정과 게스트만 부른다. 게스트는 BE가 기록 없는
 * 사용자로 보고 빈 목록을 주지만 화면은 부르지 않고 바로 빈 상태를 그린다(`MeActivityFeed`). 커서
 * 규약, 캐시 정책, 씨앗 우선은 내 댓글(`useMyComments`)과 같다. 예측 등록·취소 뒤에는
 * `invalidateAfterPredictionWrite`가 상위 키(`mine`)로 다시 받으니 여기서 더 할 일이 없다.
 *
 * @param initial 서버 컴포넌트가 미리 받아 둔 첫 페이지와 그 시각. 예측 탭을 보고 있을 때만 있다
 */
export function useMyPredictions(initial?: {
  page: MyPredictionPage;
  fetchedAt: number;
}) {
  useFreshSeed(
    predictionKeys.myList(),
    initial && {
      data: { pages: [initial.page], pageParams: [null] },
      fetchedAt: initial.fetchedAt,
    },
  );

  return useInfiniteQuery({
    queryKey: predictionKeys.myList(),
    queryFn: ({ pageParam }) => getMyPredictions({ cursor: pageParam }),
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

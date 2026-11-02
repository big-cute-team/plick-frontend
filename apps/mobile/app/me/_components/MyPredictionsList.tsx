"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@plick/core/client";
import { restartFeedQuery } from "@plick/core/feed-refresh";
import { predictionKeys } from "@plick/core/predictionKeys";
import type { MyPredictionPage } from "@plick/domain/prediction";
import {
  MY_PREDICTIONS_ERROR,
  MY_PREDICTIONS_NEXT_ERROR,
} from "@/_constants/activity";
import { useInfiniteScroll } from "@/_hooks/useInfiniteScroll";
import { useMyPredictions } from "@plick/core/prediction-queries";
import { ActivityEmpty } from "./ActivityEmpty";
import { ActivityLoginPrompt } from "./ActivityLoginPrompt";
import { MyPredictionRow } from "./MyPredictionRow";
import { MyPredictionRowSkeleton } from "./MyPredictionRowSkeleton";

/** 첫 로딩에 보여줄 자리 개수. */
const SKELETON_COUNT = 4;

/**
 * 예측 탭의 무한스크롤 목록 (KAN-702, 시안 가이드 §5.8). 서버 순서를 그대로 둔다(결과 대기 먼저, 그다음
 * 킥오프 역순). 로딩, 에러, 빈 상태와 커서 400 복구, 401 로그인 안내는 내 댓글 탭(`MyCommentsList`)과
 * 같다.
 *
 * @param initial 서버가 미리 받아 둔 첫 페이지와 그 시각
 */
export function MyPredictionsList({
  initial,
}: {
  initial?: { page: MyPredictionPage; fetchedAt: number };
}) {
  const queryClient = useQueryClient();
  const {
    data,
    error,
    isPending,
    isError,
    isFetching,
    isFetchingNextPage,
    isFetchNextPageError,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useMyPredictions(initial);

  const sentinelRef = useInfiniteScroll(
    fetchNextPage,
    hasNextPage && !isFetching && !isFetchNextPageError,
  );

  const entries = data?.pages.flatMap((page) => page.items) ?? [];

  /* 커서가 상해 400이면 같은 커서로 재시도해봐야 계속 400이다. 첫 페이지부터 다시 받는다 */
  function retryNextPage() {
    if (error instanceof ApiError && error.status === 400) {
      void restartFeedQuery(queryClient, predictionKeys.myList());
      return;
    }
    fetchNextPage();
  }

  if (isPending) {
    return (
      <div className="px-edge">
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <MyPredictionRowSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError && entries.length === 0) {
    if (error instanceof ApiError && error.status === 401) {
      return <ActivityLoginPrompt />;
    }
    return (
      <div className="py-10 text-center">
        <p className="text-body text-text-4">{MY_PREDICTIONS_ERROR}</p>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-label-lg text-accent mt-2 font-bold active:opacity-60 disabled:opacity-50"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (entries.length === 0) {
    return <ActivityEmpty tab="predictions" />;
  }

  return (
    <div className="px-edge">
      {entries.map((entry) => (
        <MyPredictionRow key={entry.id} entry={entry} />
      ))}

      {isFetchingNextPage && <MyPredictionRowSkeleton />}

      {isFetchNextPageError && (
        <div className="py-6 text-center">
          <p className="text-caption-lg text-text-4">
            {MY_PREDICTIONS_NEXT_ERROR}
          </p>
          <button
            type="button"
            onClick={retryNextPage}
            className="text-label-lg text-accent mt-2 font-bold active:opacity-60"
          >
            다시 시도
          </button>
        </div>
      )}

      <div ref={sentinelRef} aria-hidden className="h-px" />
    </div>
  );
}

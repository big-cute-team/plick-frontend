"use client";

import { useQueryClient } from "@tanstack/react-query";
import { activityKeys } from "@plick/core/activityKeys";
import { ApiError } from "@plick/core/client";
import { restartFeedQuery } from "@plick/core/feed-refresh";
import { useInfiniteScroll } from "@/_hooks/useInfiniteScroll";
import { useMyComments } from "@/_hooks/useMyComments";
import type { MyCommentPage } from "@/_types/activity";
import { ActivityEmpty } from "./ActivityEmpty";
import { ActivityLoginPrompt } from "./ActivityLoginPrompt";
import { MyCommentItem } from "./MyCommentItem";
import { MyCommentSkeleton } from "./MyCommentSkeleton";

/** 첫 로딩에 보여줄 자리 개수. 줄이 기사보다 길어 하나 덜 둔다. */
const SKELETON_COUNT = 3;

/**
 * 내가 쓴 댓글 탭의 무한스크롤 리스트 (KAN-495).
 *
 * 로딩·에러·빈 상태와 커서 400 복구, 401 로그인 카드는 좋아요 탭
 * (`LikedArticlesList`)과 같다. 삭제한 댓글은 `useDeleteComment`가 캐시에서
 * 빼 두므로 여기서 걸러낼 게 없다.
 *
 * @param initial 서버가 미리 받아 둔 첫 페이지와 그 시각
 */
export function MyCommentsList({
  initial,
}: {
  initial?: { page: MyCommentPage; fetchedAt: number };
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
  } = useMyComments(initial);

  const sentinelRef = useInfiniteScroll(
    fetchNextPage,
    hasNextPage && !isFetching && !isFetchNextPageError,
  );

  const comments = data?.pages.flatMap((page) => page.items) ?? [];

  function retryNextPage() {
    if (error instanceof ApiError && error.status === 400) {
      void restartFeedQuery(queryClient, activityKeys.comments());
      return;
    }
    fetchNextPage();
  }

  if (isPending) {
    return (
      <div className="px-edge">
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <MyCommentSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError && comments.length === 0) {
    if (error instanceof ApiError && error.status === 401) {
      return (
        <div className="px-edge pt-4">
          <ActivityLoginPrompt />
        </div>
      );
    }
    return (
      <div className="py-12 text-center">
        <p className="text-body text-text-4">내 댓글을 불러오지 못했어요.</p>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="bg-elevate text-label text-text rounded-control mt-3 px-4 py-2 font-bold active:opacity-70 disabled:opacity-50"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (comments.length === 0) {
    return <ActivityEmpty tab="comments" />;
  }

  return (
    <div className="px-edge">
      {comments.map((comment) => (
        <MyCommentItem key={comment.id} comment={comment} />
      ))}

      {isFetchingNextPage && <MyCommentSkeleton />}

      {isFetchNextPageError && (
        <div className="py-6 text-center">
          <p className="text-caption text-text-4">
            다음 댓글을 불러오지 못했어요.
          </p>
          <button
            type="button"
            onClick={retryNextPage}
            className="bg-elevate text-label text-text rounded-control mt-2 px-4 py-2 font-bold active:opacity-70"
          >
            다시 시도
          </button>
        </div>
      )}

      <div ref={sentinelRef} aria-hidden className="h-px" />

      {!hasNextPage && (
        <p className="text-caption text-text-4 pt-6 pb-4 text-center">
          내가 쓴 댓글을 전부 봤어요.
        </p>
      )}
    </div>
  );
}

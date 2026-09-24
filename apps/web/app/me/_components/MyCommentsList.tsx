"use client";

import { useQueryClient } from "@tanstack/react-query";
import { activityKeys } from "@plick/core/activityKeys";
import { ApiError } from "@plick/core/client";
import { restartFeedQuery } from "@plick/core/feed-refresh";
import { useInfiniteScroll } from "@/_hooks/useInfiniteScroll";
import { useMyComments } from "@/_hooks/useMyComments";
import type { MyCommentPage } from "@/_types/activity";
import { ActivityEmpty } from "./ActivityEmpty";
import { ActivityRetry } from "./ActivityRetry";
import { MyCommentRow } from "./MyCommentRow";

/** 첫 로딩에 보여줄 자리 개수. */
const SKELETON_COUNT = 3;

/**
 * 내 댓글 탭의 무한스크롤 목록 (KAN-495 모바일 → KAN-567 웹 이식).
 *
 * 로딩, 에러, 빈 상태와 커서 400 복구는 기사 목록(`PostFeed`)과 같다. 삭제한 댓글은
 * `useDeleteComment`가 캐시에서 빼 두므로 여기서 걸러낼 게 없다. 토큰이 만료돼
 * 401이 오면 페이지가 먼저 걸러 로그인 안내를 그리므로 여기서는 일반 실패로 둔다.
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

  /* 커서가 상해 400이면 같은 커서로 재시도해봐야 계속 400이다. 첫 페이지부터 다시 받는다 */
  function retryNextPage() {
    if (error instanceof ApiError && error.status === 400) {
      void restartFeedQuery(queryClient, activityKeys.comments());
      return;
    }
    fetchNextPage();
  }

  if (isPending) {
    return (
      <div>
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <RowSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError && comments.length === 0) {
    return (
      <ActivityRetry
        message="내 댓글을 불러오지 못했어요"
        onRetry={() => refetch()}
        disabled={isFetching}
      />
    );
  }

  if (comments.length === 0) {
    return <ActivityEmpty tab="comments" />;
  }

  return (
    <div>
      {comments.map((comment) => (
        <MyCommentRow key={comment.id} comment={comment} />
      ))}

      {isFetchingNextPage && <RowSkeleton />}

      {isFetchNextPageError && (
        <ActivityRetry
          message="다음 댓글을 불러오지 못했어요"
          onRetry={retryNextPage}
        />
      )}

      {/* 이 자리가 보이면 다음 페이지를 당긴다. 마지막 페이지면 관찰을 끈다 */}
      <div ref={sentinelRef} aria-hidden className="h-px" />
    </div>
  );
}

/** 댓글 줄 자리 — 본문 두 줄과 오른쪽 기사 제목 칸의 실루엣. */
function RowSkeleton() {
  return (
    <div className="border-border-soft flex animate-pulse gap-5 border-b py-3.75">
      <div className="flex flex-1 flex-col gap-2">
        <div className="bg-chip h-4 w-4/5" />
        <div className="bg-chip h-4 w-2/5" />
      </div>
      <div className="bg-chip h-4 w-61.5 shrink-0" />
    </div>
  );
}

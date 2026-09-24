"use client";

import { useQueryClient } from "@tanstack/react-query";
import { activityKeys } from "@plick/core/activityKeys";
import { ApiError } from "@plick/core/client";
import { restartFeedQuery } from "@plick/core/feed-refresh";
import type { InitialArticleFeed } from "@plick/domain/types";
import { useInfiniteScroll } from "@/_hooks/useInfiniteScroll";
import { useLikedArticles } from "@/_hooks/useLikedArticles";
import { ActivityEmpty } from "./ActivityEmpty";
import { ActivityRetry } from "./ActivityRetry";
import { LikedArticleRow } from "./LikedArticleRow";

/** 첫 로딩에 보여줄 자리 개수. */
const SKELETON_COUNT = 4;

/**
 * 좋아요 탭의 무한스크롤 목록 (KAN-495 모바일 → KAN-567 웹 이식).
 *
 * 하트를 끈 카드는 그리지 않는다. 세부, 릴스에서 좋아요를 끄거나 이 표의 "해제"를
 * 누르면 `syncLikeIntoFeeds`가 이 캐시의 그 카드를 `liked: false`로 바꿔 두므로
 * 목록에서 바로 빠진 것처럼 보인다. 서버는 다음 조회부터 빼 준다. 캐시에서 항목을
 * 지우지 않는 이유는 다시 켜면 되살아나야 해서다.
 *
 * 로딩, 에러, 빈 상태와 커서 400 복구는 기사 목록과 같다.
 *
 * @param initial 서버가 미리 받아 둔 첫 페이지와 그 시각
 */
export function LikedArticlesList({
  initial,
}: {
  initial?: InitialArticleFeed;
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
  } = useLikedArticles(initial);

  /* `isFetching`으로 막는 이유는 PostFeed와 같다 (KAN-404 커서 400 루프) */
  const sentinelRef = useInfiniteScroll(
    fetchNextPage,
    hasNextPage && !isFetching && !isFetchNextPageError,
  );

  const articles = (data?.pages.flatMap((page) => page.items) ?? []).filter(
    (article) => article.liked,
  );

  /* 커서가 상해 400이면 같은 커서로 재시도해봐야 계속 400이다. 첫 페이지부터 다시 받는다 */
  function retryNextPage() {
    if (error instanceof ApiError && error.status === 400) {
      void restartFeedQuery(queryClient, activityKeys.likes());
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

  if (isError && articles.length === 0) {
    return (
      <ActivityRetry
        message="좋아요한 기사를 불러오지 못했어요"
        onRetry={() => refetch()}
        disabled={isFetching}
      />
    );
  }

  if (articles.length === 0) {
    return <ActivityEmpty tab="likes" />;
  }

  return (
    <div>
      {articles.map((article) => (
        <LikedArticleRow key={article.id} article={article} />
      ))}

      {isFetchingNextPage && <RowSkeleton />}

      {isFetchNextPageError && (
        <ActivityRetry
          message="다음 기사를 불러오지 못했어요"
          onRetry={retryNextPage}
        />
      )}

      <div ref={sentinelRef} aria-hidden className="h-px" />
    </div>
  );
}

/** 표 한 행 자리 — 엠블럼 원과 제목 막대의 실루엣. */
function RowSkeleton() {
  return (
    <div className="border-border-soft flex h-9.5 animate-pulse items-center gap-3 border-b">
      <div className="bg-chip mx-2.5 size-5 rounded-full" />
      <div className="bg-chip h-4 flex-1" />
    </div>
  );
}

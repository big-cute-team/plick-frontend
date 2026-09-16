"use client";

import { useQueryClient } from "@tanstack/react-query";
import { articleKeys } from "@plick/core/articleKeys";
import { ApiError } from "@plick/core/client";
import { restartFeedQuery } from "@plick/core/feed-refresh";
import type { InitialArticleFeed } from "@plick/domain/types";
import { PostListItem } from "@/_components/PostListItem";
import { PostListItemSkeleton } from "@/_components/PostListItemSkeleton";
import { useFigureArticles } from "@/_hooks/useFigureArticles";
import { useInfiniteScroll } from "@/_hooks/useInfiniteScroll";

/** 첫 로딩에 보여줄 자리 개수. 기사 페이지와 같다. */
const SKELETON_COUNT = 4;

/**
 * 인물 관련 기사 무한스크롤 리스트 (KAN-501). 모바일 `FigureArticlesFeed`의
 * 데스크톱 판이고, 줄은 기사 페이지와 같은 `PostListItem`(article 변형)이다 —
 * 응답이 기사 목록과 같은 카드라 전용 줄을 만들면 같은 카드가 둘로 갈린다.
 *
 * 팀 탭이 없으므로 대표 팀은 기사의 첫 팀이다(`filter` 기본값 ALL).
 *
 * 로딩·에러·빈 상태와 커서 400 복구는 기사 페이지(`PostFeed`)와 같다. 인물
 * 태그는 앞으로 수집되는 기사부터 붙어서 빈 상태가 흔하다.
 *
 * @param figureId 인물 id
 * @param initial 서버가 미리 받아 둔 첫 페이지와 그 시각
 */
export function FigureArticlesFeed({
  figureId,
  initial,
}: {
  figureId: string;
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
  } = useFigureArticles(figureId, initial);

  /* `isFetching`으로 막는 이유는 PostFeed와 같다 (KAN-404 커서 400 루프) */
  const sentinelRef = useInfiniteScroll(
    fetchNextPage,
    hasNextPage && !isFetching && !isFetchNextPageError,
  );

  const articles = data?.pages.flatMap((page) => page.items) ?? [];

  /* 커서가 상해 400이면 같은 커서로 재시도해봐야 계속 400이다. 첫 페이지부터 다시 받는다 */
  function retryNextPage() {
    if (error instanceof ApiError && error.status === 400) {
      void restartFeedQuery(queryClient, articleKeys.figureFeed(figureId));
      return;
    }
    fetchNextPage();
  }

  if (isPending) {
    return (
      <div>
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <PostListItemSkeleton key={i} variant="article" />
        ))}
      </div>
    );
  }

  if (isError && articles.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-body text-text-4">관련 기사를 불러오지 못했어요.</p>
        <RetryButton onClick={() => refetch()} disabled={isFetching} />
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <p className="text-body text-text-4 py-12 text-center">
        아직 이 인물의 소식이 없어요.
      </p>
    );
  }

  return (
    <div>
      {articles.map((article) => (
        <PostListItem key={article.id} post={article} variant="article" />
      ))}

      {isFetchingNextPage && <PostListItemSkeleton variant="article" />}

      {isFetchNextPageError && (
        <div className="py-6 text-center">
          <p className="text-caption text-text-4">
            다음 기사를 불러오지 못했어요.
          </p>
          <RetryButton onClick={retryNextPage} />
        </div>
      )}

      {/* 이 자리가 보이면 다음 페이지를 당긴다. 마지막 페이지면 관찰을 끈다 */}
      <div ref={sentinelRef} aria-hidden className="h-px" />

      {!hasNextPage && (
        <p className="text-caption text-text-4 pt-6 pb-4 text-center">
          관련 기사를 전부 봤어요.
        </p>
      )}
    </div>
  );
}

/** 실패 자리의 다시 시도 버튼 — 첫 페이지와 다음 페이지 실패가 같은 모양을 쓴다. */
function RetryButton({
  onClick,
  disabled = false,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="bg-elevate text-label text-text rounded-control focus-visible:outline-accent mt-3 px-4 py-2 font-bold transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
    >
      다시 시도
    </button>
  );
}

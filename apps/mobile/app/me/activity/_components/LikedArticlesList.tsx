"use client";

import { useQueryClient } from "@tanstack/react-query";
import { activityKeys } from "@plick/core/activityKeys";
import { ApiError } from "@plick/core/client";
import { restartFeedQuery } from "@plick/core/feed-refresh";
import type { InitialArticleFeed } from "@plick/domain/types";
import { NewsItem } from "@/_components/NewsItem";
import { NewsItemSkeleton } from "@/_components/NewsItemSkeleton";
import { useInfiniteScroll } from "@/_hooks/useInfiniteScroll";
import { useLikedArticles } from "@/_hooks/useLikedArticles";
import { ActivityEmpty } from "./ActivityEmpty";
import { ActivityLoginPrompt } from "./ActivityLoginPrompt";

/** 첫 로딩에 보여줄 자리 개수. 기사 페이지와 같다. */
const SKELETON_COUNT = 4;

/**
 * 좋아요한 기사 탭의 무한스크롤 리스트 (KAN-495).
 *
 * 항목은 홈 피드의 `NewsItem`을 그대로 쓴다. 카드 계약이 홈 피드와 같아서
 * 마이페이지 전용 카드를 만들면 같은 카드가 둘로 갈린다(BE 설계 결정과 같은
 * 판단). 팀 탭이 없으므로 대표 팀은 기사의 첫 팀이다.
 *
 * 하트를 끈 카드는 그리지 않는다. 세부·릴스에서 좋아요를 끄면 `syncLikeIntoFeeds`가
 * 이 캐시의 그 카드를 `liked: false`로 바꿔 두므로, 돌아왔을 때 목록에서 바로
 * 빠진 것처럼 보인다. 서버는 다음 조회부터 빼 준다. 캐시에서 항목을 지우지
 * 않는 이유는 다시 켜면 되살아나야 해서다.
 *
 * 로딩·에러·빈 상태와 커서 400 복구는 기사 페이지(`ArticlesFeed`)와 같다.
 * 토큰이 만료돼 401이 오면 목록 자리에 로그인 카드를 그린다.
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

  /* `isFetching`으로 막는 이유는 ArticlesFeed와 같다 (KAN-404 커서 400 루프) */
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
      <div className="px-edge">
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <NewsItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError && articles.length === 0) {
    if (error instanceof ApiError && error.status === 401) {
      return (
        <div className="px-edge pt-4">
          <ActivityLoginPrompt />
        </div>
      );
    }
    return (
      <div className="py-12 text-center">
        <p className="text-body text-text-4">
          좋아요한 기사를 불러오지 못했어요.
        </p>
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

  if (articles.length === 0) {
    return <ActivityEmpty tab="likes" />;
  }

  return (
    <div className="px-edge">
      {articles.map((article) => (
        <NewsItem key={article.id} article={article} />
      ))}

      {isFetchingNextPage && <NewsItemSkeleton />}

      {isFetchNextPageError && (
        <div className="py-6 text-center">
          <p className="text-caption text-text-4">
            다음 기사를 불러오지 못했어요.
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

      {/* 이 자리가 보이면 다음 페이지를 당긴다. 마지막 페이지면 관찰을 끈다 */}
      <div ref={sentinelRef} aria-hidden className="h-px" />

      {!hasNextPage && (
        <p className="text-caption text-text-4 pt-6 pb-4 text-center">
          좋아요한 기사를 전부 봤어요.
        </p>
      )}
    </div>
  );
}

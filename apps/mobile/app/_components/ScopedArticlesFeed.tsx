"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@plick/core/client";
import { restartFeedQuery } from "@plick/core/feed-refresh";
import type { InitialArticleFeed } from "@plick/domain/types";
import { NewsItem } from "@/_components/NewsItem";
import { NewsItemSkeleton } from "@/_components/NewsItemSkeleton";
import { useInfiniteScroll } from "@/_hooks/useInfiniteScroll";
import { useScopedArticles } from "@/_hooks/useScopedArticles";
import type { ArticleScope } from "@/_types/articles";
import { scopedArticlesKey } from "@/_utils/articles";

/** 첫 로딩에 보여줄 자리 개수. 기사 페이지와 같다. */
const SKELETON_COUNT = 4;

/**
 * 범위(인물·이슈)로 거른 기사 무한스크롤 리스트 (KAN-500, 이슈 추가 KAN-709). 인물 프로필 전용
 * `FigureArticlesFeed`였는데 이슈 페이지가 같은 목록을 쓰게 되면서 범위를 받게 넓혀 `_components`로
 * 올렸다. 웹 `ScopedArticlesFeed`의 모바일 판이다.
 *
 * 항목은 홈 피드의 `NewsItem`을 그대로 쓴다. 응답이 홈 피드와 같은 카드라
 * 전용 카드를 만들면 같은 카드가 둘로 갈린다(좋아요 목록 KAN-495와 같은
 * 판단). 팀 탭이 없으므로 대표 팀은 기사의 첫 팀이다.
 *
 * 로딩·에러·빈 상태와 커서 400 복구는 릴스 피드(`ReelsFeed`)와 같다.
 * 인물 태그는 앞으로 수집되는 기사부터 붙어서 배포 직후엔 빈 상태가 흔하다.
 *
 * @param scope 무엇으로 거를지
 * @param initial 서버가 미리 받아 둔 첫 페이지와 그 시각
 * @param emptyText 기사가 하나도 없을 때 문구
 */
export function ScopedArticlesFeed({
  scope,
  initial,
  emptyText,
}: {
  scope: ArticleScope;
  initial?: InitialArticleFeed;
  emptyText: string;
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
  } = useScopedArticles(scope, initial);

  /* `isFetching`으로 막는 이유는 ReelsFeed와 같다 (KAN-404 커서 400 루프) */
  const sentinelRef = useInfiniteScroll(
    fetchNextPage,
    hasNextPage && !isFetching && !isFetchNextPageError,
  );

  const articles = data?.pages.flatMap((page) => page.items) ?? [];

  /* 커서가 상해 400이면 같은 커서로 재시도해봐야 계속 400이다. 첫 페이지부터 다시 받는다 */
  function retryNextPage() {
    if (error instanceof ApiError && error.status === 400) {
      void restartFeedQuery(queryClient, scopedArticlesKey(scope));
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
    return (
      <div className="py-10 text-center">
        <p className="text-body text-text-4">관련 기사를 불러오지 못했어요</p>
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

  if (articles.length === 0) {
    return <p className="text-body text-text-4 px-edge py-6">{emptyText}</p>;
  }

  return (
    <div className="px-edge">
      {articles.map((article) => (
        <NewsItem key={article.id} article={article} />
      ))}

      {isFetchingNextPage && <NewsItemSkeleton />}

      {isFetchNextPageError && (
        <div className="py-6 text-center">
          <p className="text-caption-lg text-text-4">
            다음 기사를 불러오지 못했어요
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

      {/* 이 자리가 보이면 다음 페이지를 당긴다. 마지막 페이지면 관찰을 끈다 */}
      <div ref={sentinelRef} aria-hidden className="h-px" />
    </div>
  );
}

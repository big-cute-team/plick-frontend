"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@plick/core/client";
import { useArticleFeed } from "@/_hooks/useArticleFeed";
import { useInfiniteScroll } from "@/_hooks/useInfiniteScroll";
import { articleKeys } from "@/_queries/articleKeys";
import { useViewState } from "@/_stores/view-state";
import type { InitialArticleFeed } from "@/_types/articles";
import { NewsItem } from "./NewsItem";
import { NewsItemSkeleton } from "./NewsItemSkeleton";
import { TeamFilterTabs } from "./TeamFilterTabs";

/** 첫 로딩에 보여줄 자리 개수 — 한 페이지 건수보다 적게 둬 화면을 덜 채운다. */
const SKELETON_COUNT = 4;

/**
 * "지금 올라온 소식" 섹션 — 팀 필터 + 무한스크롤 리스트.
 *
 * 필터는 화면에서 거르지 않고 BE `teamId`로 넘겨 팀별 최신순 목록을 새로 받는다
 * (KAN-271). 전체 탭 첫 페이지는 서버가 미리 받아 `initial`로 내려주므로 첫
 * 렌더에는 스켈레톤이 보이지 않고, 리스트 끝에 닿으면 커서로 다음 페이지를 잇는다.
 *
 * 선택한 팀은 컴포넌트가 아니라 뷰 상태 스토어가 들고 있다 (KAN-314). `useState`에
 * 두면 기사에 들어갔다 나오거나 릴스에 다녀오는 순간 트리가 언마운트되면서 전체
 * 탭으로 돌아가 버린다. 데이터는 쿼리 캐시에 그대로 남아 있으므로, 어느 탭을 보고
 * 있었는지만 트리 밖에서 기억하면 돌아왔을 때 그 자리 그대로다.
 *
 * @param initial 서버 컴포넌트가 받아 둔 전체 탭 첫 페이지와 그 시각. 서버 fetch가
 *   실패했으면 없이 들어오고, 그때는 클라가 직접 받아 로딩·에러를 보여준다.
 */
export function NewsFeed({ initial }: { initial?: InitialArticleFeed }) {
  const filter = useViewState((state) => state.homeFilter);
  const setFilter = useViewState((state) => state.setHomeFilter);
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
  } = useArticleFeed(filter, initial);

  const sentinelRef = useInfiniteScroll(
    fetchNextPage,
    hasNextPage && !isFetchingNextPage && !isFetchNextPageError,
  );

  const articles = data?.pages.flatMap((page) => page.items) ?? [];

  /**
   * 커서는 서버가 발급한 값이라 상하면 400으로 온다. 잘못된 파라미터와 같은
   * `COMMON_INVALID_PARAM` 코드라 둘을 구분할 방법이 없으므로, 다음 페이지에서
   * 400을 받으면 커서를 버리고 첫 페이지부터 다시 받는다. 같은 커서로 재시도해봐야
   * 계속 400이다.
   */
  function retryNextPage() {
    if (error instanceof ApiError && error.status === 400) {
      queryClient.resetQueries({ queryKey: articleKeys.feed(filter) });
      return;
    }
    fetchNextPage();
  }

  return (
    <>
      <TeamFilterTabs value={filter} onChange={setFilter} />
      <div className="px-edge">
        {isPending ? (
          Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <NewsItemSkeleton key={i} />
          ))
        ) : isError && articles.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-body text-text-4">소식을 불러오지 못했어요.</p>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="bg-elevate text-label text-text rounded-control mt-3 px-4 py-2 font-bold active:opacity-70 disabled:opacity-50"
            >
              다시 시도
            </button>
          </div>
        ) : articles.length > 0 ? (
          <>
            {articles.map((article) => (
              <NewsItem key={article.id} article={article} />
            ))}

            {isFetchingNextPage && <NewsItemSkeleton />}

            {isFetchNextPageError && (
              <div className="py-6 text-center">
                <p className="text-caption text-text-4">
                  다음 소식을 불러오지 못했어요.
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

            {/* 이 자리가 보이면 다음 페이지를 당긴다. 마지막 페이지면 관찰을 끈다. */}
            <div ref={sentinelRef} aria-hidden className="h-px" />
          </>
        ) : (
          <p className="text-body text-text-4 py-12 text-center">
            아직 이 팀 소식이 없어요.
          </p>
        )}
      </div>
    </>
  );
}

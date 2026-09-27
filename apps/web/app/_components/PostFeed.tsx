"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  teamFilterFromPathname,
  teamHubPath,
  teamHubTitle,
} from "@plick/domain/format";
import type { Filter, InitialArticleFeed } from "@plick/domain/types";
import { ApiError } from "@plick/core/client";
import { articleKeys } from "@plick/core/articleKeys";
import { ARTICLES_PAGE_SIZE } from "@plick/core/articles";
import { restartFeedQuery } from "@plick/core/feed-refresh";
import { PostListItem } from "@/_components/PostListItem";
import { PostListItemSkeleton } from "@/_components/PostListItemSkeleton";
import { PostTableHead } from "@/_components/PostTableHead";
import { TeamFilterTabs } from "@/_components/TeamFilterTabs";
import { useArticleFeed } from "@/_hooks/useArticleFeed";
import { useFeedRefresh } from "@/_hooks/useFeedRefresh";
import { useScrollRestore } from "@/_hooks/useScrollRestore";
import { useViewState } from "@/_stores/view-state";

/**
 * 첫 로딩에 보여줄 자리 개수. 한 페이지 건수와 같게 둔다 (KAN-386). 팀 전환으로
 * 스켈레톤이 리스트를 대신하는 동안 문서가 짧아지면 브라우저가 스크롤을 깎아
 * 화면이 위로 딸려 올라간다.
 */
const SKELETON_COUNT = ARTICLES_PAGE_SIZE;

/**
 * 홈 "새로 올라온 이슈"의 팀 필터 탭 + 표 머리 + 팀별 이슈 표 (KAN-321, 시안 KAN-567
 * 홈 표). 표 끝 "이슈 더 보기"를 누르면 다음 페이지를 이 자리에 이어 붙인다.
 *
 * 전에는 기사 페이지(`/articles`)와 `variant`로 공용했고, 홈은 첫 페이지 고정에 더
 * 보기 링크가 기사 페이지로 보냈다(KAN-386). KAN-569에서 기사 목록을 홈 하나로
 * 합치며 기사 페이지를 지웠다. 자동 무한스크롤로 되돌리지 않고 누를 때만 받는다.
 * 무한스크롤 시절에는 팀을 바꿀 때 스크롤 앵커링이 감시 요소를 화면에 붙잡아 다음
 * 페이지 요청이 연쇄로 나갔는데, 버튼은 누르기 전엔 요청이 없어 그 문제가 없다.
 * 팀을 바꿔도 스크롤은 그 자리 그대로다. 시안의 숫자 페이지 버튼(1 2 3 4 다음)은
 * BE가 커서 페이지네이션이라 만들 수 없어(API 공백) 버튼 하나다.
 *
 * 필터는 화면에서 거르지 않고 BE `teamId`로 넘겨 팀별 최신순 목록을 새로 받는다
 * (KAN-271). 선택 탭 첫 페이지는 서버 컴포넌트가 미리 받아 `initial`로 내려주므로
 * 첫 렌더에는 스켈레톤이 보이지 않는다.
 *
 * 어느 팀을 보고 있는지는 URL이 정한다 (KAN-350). `/`가 전체, 팀 허브
 * `/teams/[slug]`가 그 팀이다. 탭 선택은 `history.replaceState`로 URL만 바꾼다.
 * Next가 네이티브 history 갱신을 `usePathname`과 동기화하므로 서버 왕복도
 * 리마운트도 없이 필터가 따라오고, 기사 상세에서 뒤로 오면 URL이 필터를
 * 되살린다. push가 아니라 replace인 이유는 탭 선택을 히스토리에 쌓지 않기
 * 위해서다. 쌓이면 뒤로가기가 탭 선택 취소가 되어 버린다.
 *
 * 스토어의 `feedFilters`는 GNB 홈 링크가 마지막으로 보던 팀 URL로 잇는 기억용으로만
 * 동기화한다({@link NavItem}). 스크롤 위치도 스토어가 든다({@link useScrollRestore}).
 *
 * 팀 탭과 표 머리는 한 덩어리로 상단 바 아래 sticky다 (KAN-386). 표를 한참
 * 내려도 열 이름과 팀 탭이 남는다.
 *
 * @param initial - 서버가 받아 둔 `initialTeam` 탭 첫 페이지와 그 시각. 서버
 *   fetch가 실패했으면 없이 들어오고, 그때는 클라가 직접 받아 로딩·에러를 보여준다.
 * @param initialTeam - `initial`이 어느 탭의 씨앗인지. 홈은 전체, 팀 허브는 그 팀.
 */
export function PostFeed({
  initial,
  initialTeam = "ALL",
}: {
  initial?: InitialArticleFeed;
  initialTeam?: Filter;
}) {
  const pathname = usePathname();
  const setFeedFilter = useViewState((state) => state.setFeedFilter);
  const filter = teamFilterFromPathname(pathname);
  const queryClient = useQueryClient();
  const refresh = useFeedRefresh();
  useScrollRestore("news");

  /**
   * URL이 정한 필터를 스토어에 흘려 둔다. 직접 진입·뒤로가기까지 포함해 GNB
   * 링크가 항상 지금 보는 탭을 가리키게 한다. 문서 제목도 여기서 맞춘다.
   * replaceState는 서버 메타데이터를 다시 렌더하지 않아 탭을 바꿔도 제목이
   * 이전 페이지 것으로 남는다.
   */
  useEffect(() => {
    setFeedFilter("news", filter);
    document.title = teamHubTitle(filter);
  }, [filter, setFeedFilter]);

  /**
   * 탭 선택. URL만 바꾸면 아래 파생이 필터·쿼리를 갈아 끼운다.
   *
   * 지금 있는 팀을 한 번 더 누르면 이동 대신 맨 위로 올리고 첫 페이지부터 다시
   * 받는다. GNB 재클릭·모바일 하단 탭 재탭과 같은 손버릇이다.
   */
  function handleChange(next: Filter) {
    if (next === filter) {
      useViewState.getState().setScrollTop("news", 0);
      window.scrollTo({ top: 0 });
      void refresh("news");
      return;
    }
    window.history.replaceState(null, "", teamHubPath(next));
  }
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
  } = useArticleFeed(filter, initial, initialTeam);

  const articles = data?.pages.flatMap((page) => page.items) ?? [];

  /**
   * 다음 페이지 받기. 커서는 서버가 발급한 값이라 상하면 400으로 온다. 잘못된
   * 파라미터와 같은 `COMMON_INVALID_PARAM` 코드라 둘을 구분할 방법이 없으므로,
   * 다음 페이지에서 400을 받았으면 커서를 버리고 첫 페이지부터 다시 받는다.
   *
   * 캐시를 비우지 않고 첫 페이지만 남겨 다시 받는다 (KAN-379). 비우면 서버가
   * 내려준 `initial` 씨앗이 다시 심겨 옛 목록이 한 번 스쳤다 간다.
   */
  function loadMore() {
    if (
      isFetchNextPageError &&
      error instanceof ApiError &&
      error.status === 400
    ) {
      void restartFeedQuery(queryClient, articleKeys.feed(filter));
      return;
    }
    void fetchNextPage();
  }

  return (
    <div className="min-w-0">
      {/* 팀 탭과 표 머리를 한 덩어리로 상단 바 아래 고정한다 (KAN-386). 바 높이는
          globals.css의 --site-header-h다. 바 - 1px는 소수점 스크롤의 픽셀 반올림 실금을 바 밑에
          1px 겹쳐 덮는 몫이다. 값은 SiteHeader 높이와 짝이다 */}
      <div className="bg-bg sticky top-[calc(var(--site-header-h)-1px)] z-10">
        <TeamFilterTabs value={filter} onChange={handleChange} />
        <PostTableHead />
      </div>
      <div>
        {isPending ? (
          Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <PostListItemSkeleton key={i} />
          ))
        ) : isError && articles.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-body text-text-4">이슈를 불러오지 못했어요</p>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="border-border-strong text-label-lg text-text-2 hover:text-accent mt-3 h-8.5 border px-4 font-bold disabled:opacity-50"
            >
              다시 시도
            </button>
          </div>
        ) : articles.length > 0 ? (
          <>
            {articles.map((post, i) => (
              <PostListItem
                key={post.id}
                post={post}
                variant="news"
                filter={filter}
                rank={i}
              />
            ))}

            {isFetchingNextPage && <PostListItemSkeleton />}

            {/* 첫 페이지 refetch 중에도 막는다. 캐시에 남은 옛 커서로 다음 페이지를
                쏘면 복구 refetch가 취소돼 400 루프에 갇힌다 (KAN-404) */}
            {(hasNextPage || isFetchNextPageError) && (
              <div className="flex h-13 items-center justify-center gap-3">
                {isFetchNextPageError && (
                  <span className="text-caption text-text-4">
                    다음 이슈를 불러오지 못했어요
                  </span>
                )}
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={isFetching}
                  className="border-border-table text-label text-text-3 hover:text-accent hover:border-accent focus-visible:outline-accent flex h-6.5 items-center border px-2.25 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
                >
                  {isFetchNextPageError ? "다시 시도" : "이슈 더 보기"}
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="text-body text-text-4 py-12 text-center">
            아직 이 팀 이슈가 없어요
          </p>
        )}
      </div>
    </div>
  );
}

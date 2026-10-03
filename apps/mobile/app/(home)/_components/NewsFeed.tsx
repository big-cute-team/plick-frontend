"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@plick/core/client";
import { articleKeys } from "@plick/core/articleKeys";
import { ARTICLES_PAGE_SIZE } from "@plick/core/articles";
import { restartFeedQuery } from "@plick/core/feed-refresh";
import { useArticleFeed } from "@/_hooks/useArticleFeed";
import { useHomeRefresh } from "@/_hooks/useHomeRefresh";
import { useViewState } from "@/_stores/view-state";
import {
  teamFilterFromPathname,
  teamHubPath,
  teamHubTitle,
} from "@plick/domain/format";
import type { Filter, InitialArticleFeed } from "@plick/domain/types";
import { NewsItem } from "@/_components/NewsItem";
import { NewsItemSkeleton } from "@/_components/NewsItemSkeleton";
import { TeamFeedPreview } from "@/_components/TeamFeedPreview";
import { TeamFilterTabs } from "@/_components/TeamFilterTabs";
import { SwipePager } from "@/_components/SwipePager";
import { neighborFilter } from "@/_constants/team-filter";

/**
 * 스켈레톤 자리 개수. 한 페이지 건수와 같게 둔다 (KAN-386). 팀 전환으로 스켈레톤이
 * 리스트를 대신하는 동안 문서가 짧아지면 브라우저가 scrollTop을 깎아 화면이
 * 위로 딸려 올라간다. 행 높이가 비슷한 자리를 같은 개수로 깔아 수축을 막는다.
 */
const SKELETON_COUNT = ARTICLES_PAGE_SIZE;

/**
 * "지금 올라온 소식" 섹션. 팀 필터 + 리스트 + "기사 더 보기" 버튼.
 *
 * 첫 페이지(10건)를 보여 주고, 리스트 끝 "기사 더 보기"를 누르면 다음 페이지를
 * 이 자리에 이어 붙인다 (KAN-569). 전에는 그 버튼이 따로 있던 기사 페이지
 * (`/articles`)로 보냈는데, 기사 목록을 홈 하나로 합치면서 그 라우트를 지웠다.
 * 자동 무한스크롤(KAN-386에서 걷어냄)로 되돌리지 않고 누를 때만 받는다. 무한스크롤
 * 시절에는 팀을 바꿀 때 스크롤 앵커링이 감시 요소를 화면에 붙잡아 다음 페이지
 * 요청이 연쇄로 나갔다. 버튼은 누르기 전엔 요청이 없어 그 문제가 없고, 팀을 바꿔도
 * 스크롤은 그 자리 그대로다.
 *
 * 필터는 화면에서 거르지 않고 BE `teamId`로 넘겨 팀별 최신순 목록을 새로 받는다
 * (KAN-271). 선택 탭 첫 페이지는 서버가 미리 받아 `initial`로 내려주므로 첫
 * 렌더에는 스켈레톤이 보이지 않는다.
 *
 * 어느 팀을 보고 있는지는 URL이 정한다 (KAN-350). 홈(`/`)이 전체, 팀 허브
 * (`/teams/[slug]`)가 그 팀이다. 탭 선택은 `history.replaceState`로 URL만 바꾼다 —
 * Next가 네이티브 history 갱신을 `usePathname`과 동기화하므로 서버 왕복도
 * 리마운트도 없이 필터가 따라온다. push가 아니라 replace인 이유는 탭 선택을
 * 히스토리에 쌓지 않기 위해서다 — 쌓으면 뒤로가기가 탭 선택 취소가 되어 버려
 * 기존 뒤로가기 감각(홈에서 뒤로 = 앱 이탈)이 깨진다.
 *
 * @param initial 서버 컴포넌트가 받아 둔 `initialTeam` 탭 첫 페이지와 그 시각.
 *   서버 fetch가 실패했으면 없이 들어오고, 그때는 클라가 직접 받아 로딩·에러를
 *   보여준다.
 * @param initialTeam `initial`이 어느 탭의 씨앗인지. 홈은 전체, 팀 허브는 그 팀.
 */
export function NewsFeed({
  initial,
  initialTeam = "ALL",
}: {
  initial?: InitialArticleFeed;
  initialTeam?: Filter;
}) {
  const pathname = usePathname();
  const filter = teamFilterFromPathname(pathname);
  const setHomeFilter = useViewState((state) => state.setHomeFilter);
  const refreshHome = useHomeRefresh();

  /**
   * URL이 정한 필터를 스토어에 흘려 둔다 — 직접 진입·뒤로가기까지 포함해
   * 하단 탭과 당겨서 새로고침이 항상 지금 보는 탭을 가리키게 한다.
   * 문서 제목도 여기서 맞춘다 — replaceState는 서버 메타데이터를 다시
   * 렌더하지 않아 탭을 바꿔도 제목이 이전 페이지 것으로 남는다.
   */
  useEffect(() => {
    setHomeFilter(filter);
    document.title = teamHubTitle(filter);
  }, [filter, setHomeFilter]);

  /**
   * 탭 선택 — URL만 바꾸면 위의 파생이 필터·쿼리를 갈아 끼운다. 스크롤은
   * 건드리지 않는다 (KAN-386) — 진입 직후 누르면 밑으로, 내려서 누르면 위로
   * 튀던 문제의 답은 "안 움직이는 것"이었고, 리스트가 첫 페이지 고정이라
   * 그래도 되는 상태가 됐다.
   *
   * 지금 있는 팀을 한 번 더 누르면 맨 위로 올리고 첫 페이지부터 다시 받는다 —
   * 하단 탭 재탭과 같은 손버릇이라 이때만 명시적으로 움직인다.
   */
  function handleChange(next: Filter) {
    if (next === filter) {
      useViewState.getState().requestTop("home");
      void refreshHome();
      return;
    }
    window.history.replaceState(null, "", teamHubPath(next));
  }

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
  } = useArticleFeed(filter, initial, initialTeam);

  const articles = data?.pages.flatMap((page) => page.items) ?? [];

  /**
   * 다음 페이지 받기. 커서는 서버가 발급한 값이라 상하면 400으로 온다. 같은 커서로
   * 다시 받아 봐야 계속 400이므로 첫 페이지부터 다시 받는다(대신 이어 본 자리는
   * 잃는다). 캐시를 비우지 않고 첫 페이지만 남겨 다시 받는다 (KAN-379).
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
    <>
      <TeamFilterTabs value={filter} onChange={handleChange} />
      {/* 리스트를 좌우로 끌면 이웃 팀으로 넘어간다 (KAN-388). 커밋은 탭 클릭과
          같은 handleChange라 URL·제목·스토어 동기화가 같은 경로를 탄다.
          미리보기는 진짜 페인과 같게 첫 페이지 몫만 자르고 스켈레톤 개수도
          맞춰, 교체 순간 픽셀이 이어진다 */}
      <SwipePager
        value={filter}
        neighborOf={neighborFilter}
        onCommit={handleChange}
        renderPreview={(team) => (
          <TeamFeedPreview
            team={team}
            skeletonCount={SKELETON_COUNT}
            limit={ARTICLES_PAGE_SIZE}
          />
        )}
      >
        <div className="px-edge">
          {isPending ? (
            Array.from({ length: SKELETON_COUNT }, (_, i) => (
              <NewsItemSkeleton key={i} />
            ))
          ) : isError && articles.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-body text-text-4">소식을 불러오지 못했어요</p>
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                className="border-border-strong text-label-lg text-text-2 rounded-control mt-3 border px-4 py-2 font-bold active:opacity-70 disabled:opacity-50"
              >
                다시 시도
              </button>
            </div>
          ) : articles.length > 0 ? (
            <>
              {articles.map((article, i) => (
                <NewsItem
                  key={article.id}
                  article={article}
                  filter={filter}
                  rank={i}
                  entry="home_feed"
                />
              ))}
              {isFetchingNextPage && <NewsItemSkeleton />}
              {isFetchNextPageError && (
                <p className="text-caption text-text-4 pt-3.5 text-center">
                  다음 소식을 불러오지 못했어요
                </p>
              )}
              {/* 첫 페이지 refetch 중에도 막는다. 캐시에 남은 옛 커서로 다음 페이지를
                  쏘면 복구 refetch가 취소돼 400 루프에 갇힌다 (KAN-404) */}
              {(hasNextPage || isFetchNextPageError) && (
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={isFetching}
                  className="border-border-strong text-label-lg text-text-2 rounded-control mt-3.5 flex h-11 w-full items-center justify-center border font-bold active:opacity-70 disabled:opacity-50"
                >
                  {isFetchNextPageError ? "다시 시도" : "기사 더 보기"}
                </button>
              )}
            </>
          ) : (
            <p className="text-body text-text-4 py-12 text-center">
              아직 이 팀 소식이 없어요
            </p>
          )}
        </div>
      </SwipePager>
    </>
  );
}

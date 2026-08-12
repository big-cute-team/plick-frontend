"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@plick/core/client";
import { articleKeys } from "@plick/core/articleKeys";
import { restartFeedQuery } from "@plick/core/feed-refresh";
import {
  articlesTeamFilterFromPathname,
  articlesTeamPath,
  articlesTeamTitle,
} from "@plick/domain/format";
import type { Filter, InitialArticleFeed } from "@plick/domain/types";
import { NewsItem } from "@/_components/NewsItem";
import { NewsItemSkeleton } from "@/_components/NewsItemSkeleton";
import { TeamFilterTabs } from "@/_components/TeamFilterTabs";
import { useArticleFeed } from "@/_hooks/useArticleFeed";
import { useArticlesRefresh } from "@/_hooks/useArticlesRefresh";
import { useInfiniteScroll } from "@/_hooks/useInfiniteScroll";
import { useViewState } from "@/_stores/view-state";

/** 첫 로딩에 보여줄 자리 개수 — 한 페이지 건수보다 적게 둬 화면을 덜 채운다. */
const SKELETON_COUNT = 4;

/**
 * 기사 페이지 본체 — 팀 필터 + 무한스크롤 리스트 (KAN-386).
 *
 * 홈 "지금 올라온 소식"에 있던 무한스크롤이 이 화면으로 옮겨 왔다. 홈은 첫
 * 페이지 고정 + 더보기 링크가 됐고, 끝까지 내려보는 경험은 여기가 맡는다.
 * 웹 기사 페이지(PostFeed의 article variant)와 같은 판단이고, 쿼리키가 홈과
 * 같아 홈에서 이미 받은 팀은 캐시를 그대로 이어 쓴다.
 *
 * 어느 팀을 보고 있는지는 URL이 정한다 (KAN-350과 같은 규약). `/articles`가
 * 전체, `/articles/teams/[slug]`가 그 팀이다. 탭 선택은 `history.replaceState`로
 * URL만 바꾼다 — 서버 왕복도 리마운트도 없이 필터가 따라오고, 탭 선택이
 * 히스토리에 쌓이지 않아 뒤로가기 감각도 그대로다.
 *
 * @param initial 서버 컴포넌트가 받아 둔 `initialTeam` 탭 첫 페이지와 그 시각.
 *   서버 fetch가 실패했으면 없이 들어오고, 그때는 클라가 직접 받아 로딩·에러를
 *   보여준다.
 * @param initialTeam `initial`이 어느 탭의 씨앗인지.
 * @param header 팀 탭 위에 함께 고정할 화면 제목 블록. 탭과 한 덩어리로 sticky라
 *   리스트를 한참 내려도 제목·부제·탭이 전부 상단에 남는다 — 화면의 좌표계가
 *   흔들리지 않아 탭 전환 때 무엇이 바뀌었는지가 리스트만으로 읽힌다.
 */
export function ArticlesFeed({
  initial,
  initialTeam = "ALL",
  header,
}: {
  initial?: InitialArticleFeed;
  initialTeam?: Filter;
  header?: ReactNode;
}) {
  const pathname = usePathname();
  const filter = articlesTeamFilterFromPathname(pathname);
  const setArticlesFilter = useViewState((state) => state.setArticlesFilter);
  const queryClient = useQueryClient();
  const refresh = useArticlesRefresh();

  /**
   * URL이 정한 필터를 스토어에 흘려 둔다 — 직접 진입·뒤로가기까지 포함해
   * 하단 탭의 기사 href와 당겨서 새로고침이 항상 지금 보는 탭을 가리키게 한다.
   * 문서 제목도 여기서 맞춘다 — replaceState는 서버 메타데이터를 다시
   * 렌더하지 않아 탭을 바꿔도 제목이 이전 페이지 것으로 남는다.
   */
  useEffect(() => {
    setArticlesFilter(filter);
    document.title = articlesTeamTitle(filter);
  }, [filter, setArticlesFilter]);

  /**
   * 탭 선택 — URL만 바꾸면 위의 파생이 필터·쿼리를 갈아 끼운다.
   *
   * 지금 있는 팀을 한 번 더 누르면 이동 대신 맨 위로 올리고 첫 페이지부터 다시
   * 받는다 — 하단 탭 재탭과 같은 손버릇이다. 다른 팀이면 떠나는 팀에서 보던
   * 위치를 적어 둔다(`scrollTops.articles`가 스크롤마다 갱신되는 현재 위치다).
   * 이미 봤던 팀으로 되돌아오면 아래 이펙트가 이 값으로 복원한다.
   */
  function handleChange(next: Filter) {
    const state = useViewState.getState();
    if (next === filter) {
      state.requestTop("articles");
      void refresh();
      return;
    }
    state.setArticlesTabScrollTop(filter, state.scrollTops.articles ?? 0);
    window.history.replaceState(null, "", articlesTeamPath(next));
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

  const sentinelRef = useInfiniteScroll(
    fetchNextPage,
    hasNextPage && !isFetchingNextPage && !isFetchNextPageError,
  );

  /**
   * 탭 전환 뒤 스크롤 자리 잡기. 처음 여는 팀(캐시 없음, 스켈레톤부터 시작)은
   * 맨 위에서 시작하고, 이미 봤던 팀은 그 팀에서 보던 위치로 되돌린다.
   *
   * 전환 전 자리에 그대로 두면 안 된다 — 필터가 sticky라 리스트를 한참 내린
   * 채로도 탭을 바꿀 수 있는데, 새 팀 로딩으로 리스트가 짧아졌다 다시 자라는
   * 동안 브라우저 스크롤 앵커링이 리스트 끝을 화면에 붙잡아 둬서 감시 요소가
   * 계속 보이고 다음 페이지 요청이 연쇄로 나간다.
   *
   * 마운트 첫 실행은 건너뛴다 — 화면을 떠났다 돌아올 때의 복원은 ScrollArea의
   * restoreKey("articles")가 맡는 다른 층이다.
   */
  const requestTop = useViewState((state) => state.requestTop);
  const listRef = useRef<HTMLDivElement>(null);
  const prevFilter = useRef(filter);
  useEffect(() => {
    if (prevFilter.current === filter) return;
    prevFilter.current = filter;
    if (isPending) {
      requestTop("articles");
      return;
    }
    const saved = useViewState.getState().articlesTabScrollTops[filter];
    const scroller = listRef.current?.closest("main");
    if (saved != null && scroller) scroller.scrollTop = saved;
  }, [filter, isPending, requestTop]);

  const articles = data?.pages.flatMap((page) => page.items) ?? [];

  /**
   * 커서는 서버가 발급한 값이라 상하면 400으로 온다. 잘못된 파라미터와 같은
   * `COMMON_INVALID_PARAM` 코드라 둘을 구분할 방법이 없으므로, 다음 페이지에서
   * 400을 받으면 커서를 버리고 첫 페이지부터 다시 받는다. 같은 커서로 재시도해봐야
   * 계속 400이다.
   *
   * 캐시를 비우지 않고 첫 페이지만 남겨 다시 받는다 (KAN-379) — 비우면 서버가
   * 내려준 `initial` 씨앗이 다시 심겨 옛 목록이 한 번 스쳤다 간다.
   */
  function retryNextPage() {
    if (error instanceof ApiError && error.status === 400) {
      void restartFeedQuery(queryClient, articleKeys.feed(filter));
      return;
    }
    fetchNextPage();
  }

  return (
    <>
      {/* 제목 블록과 탭을 한 덩어리로 고정한다 (KAN-386). 탭 자체의 sticky는
          이 래퍼가 붙잡고 있는 동안 움직일 일이 없어 그대로 둬도 무해하다.
          -top-px는 소수점 스크롤 위치의 픽셀 반올림 실금을 덮는 몫이다 */}
      <div className="bg-bg sticky -top-px z-10">
        {header}
        <TeamFilterTabs
          value={filter}
          onChange={handleChange}
          hrefFor={articlesTeamPath}
        />
      </div>
      <div ref={listRef} className="px-edge">
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
              <NewsItem key={article.id} article={article} filter={filter} />
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

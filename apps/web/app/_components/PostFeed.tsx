"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  articlesTeamFilterFromPathname,
  articlesTeamPath,
  articlesTeamTitle,
  teamFilterFromPathname,
  teamHubPath,
  teamHubTitle,
} from "@plick/domain/format";
import type { Filter, InitialArticleFeed } from "@plick/domain/types";
import { ApiError } from "@plick/core/client";
import { articleKeys } from "@plick/core/articleKeys";
import { ARTICLES_PAGE_SIZE } from "@plick/core/articles";
import { restartFeedQuery } from "@plick/core/feed-refresh";
import { MoreArticlesLink } from "@/_components/MoreArticlesLink";
import { PostListItem } from "@/_components/PostListItem";
import { PostListItemSkeleton } from "@/_components/PostListItemSkeleton";
import { TeamFilterTabs } from "@/_components/TeamFilterTabs";
import { useArticleFeed } from "@/_hooks/useArticleFeed";
import { useFeedRefresh } from "@/_hooks/useFeedRefresh";
import { useInfiniteScroll } from "@/_hooks/useInfiniteScroll";
import { useScrollRestore } from "@/_hooks/useScrollRestore";
import { useViewState } from "@/_stores/view-state";
import type { PostListVariant } from "@/_types/app";

/**
 * 첫 로딩에 보여줄 자리 개수. 기사 페이지는 한 페이지 건수보다 적게 둬 화면을
 * 덜 채우고, 홈은 노출 건수와 같게 둔다 (KAN-386) — 팀 전환으로 스켈레톤이
 * 리스트를 대신하는 동안 문서가 짧아지면 브라우저가 스크롤을 깎아 화면이 위로
 * 딸려 올라간다.
 */
const SKELETON_COUNT: Record<PostListVariant, number> = {
  news: ARTICLES_PAGE_SIZE,
  article: 4,
};

/**
 * 팀 필터 탭 + 팀별 기사 리스트를 묶는 클라이언트 컨테이너 (KAN-321).
 * 홈 "지금 올라온 소식"과 기사 페이지가 `variant`로 공용한다.
 *
 * 필터는 화면에서 거르지 않고 BE `teamId`로 넘겨 팀별 최신순 목록을 새로 받는다
 * (KAN-271). 전체 탭 첫 페이지는 서버 컴포넌트가 미리 받아 `initial`로
 * 내려주므로 첫 렌더에는 스켈레톤이 보이지 않는다.
 *
 * 무한스크롤은 기사(article)만이다 (KAN-386). 홈(news)은 첫 페이지(10건) 고정
 * + 기사 페이지로 가는 더보기 링크다 — 무한스크롤 시절에는 팀을 바꿀 때
 * 스크롤을 강제로 옮겨야 했는데(짧아진 리스트를 앵커링이 붙잡아 다음 페이지
 * 요청이 연쇄로 나간다), 스크롤이 위아래로 튀는 그 보정이 홈에서는 UX 문제였다.
 * 리스트를 첫 페이지로 고정하면 보정 자체가 필요 없어져 팀을 바꿔도 스크롤이
 * 그 자리 그대로다. 팀별 스크롤 기억도 같은 이유로 기사만 남았다.
 *
 * 어느 팀을 보고 있는지는 URL이 정한다 (KAN-350). 홈(news)은 `/`가 전체,
 * 팀 허브 `/teams/[slug]`가 그 팀이고, 기사(article)는 `/articles`가 전체,
 * `/articles/teams/[slug]`가 그 팀이다. 탭 선택은 `history.replaceState`로
 * URL만 바꾼다 — Next가 네이티브 history 갱신을 `usePathname`과 동기화하므로
 * 서버 왕복도 리마운트도 없이 필터가 따라오고, 기사 상세에서 뒤로 오면 URL이
 * 필터를 되살린다. push가 아니라 replace인 이유는 탭 선택을 히스토리에 쌓지
 * 않기 위해서다 — 쌓이면 뒤로가기가 탭 선택 취소가 되어 버린다.
 *
 * 필터를 URL로 옮기기 전(KAN-321)에는 뷰 상태 스토어가 원본이었다(모바일
 * KAN-314와 같은 판단). 지금 스토어의 `feedFilters`는 GNB의 홈·기사 링크가
 * 마지막으로 보던 팀 URL로 잇는 기억용으로만 동기화한다({@link NavItem}).
 *
 * 스크롤 위치는 두 surface 모두 스토어가 든다({@link useScrollRestore}).
 *
 * @param initial - 서버가 받아 둔 `initialTeam` 탭 첫 페이지와 그 시각. 서버
 *   fetch가 실패했으면 없이 들어오고, 그때는 클라가 직접 받아 로딩·에러를 보여준다.
 * @param initialTeam - `initial`이 어느 탭의 씨앗인지. 목록 라우트는 전체,
 *   팀 라우트는 그 팀.
 * @param variant - 행 변형(news=홈, article=기사)
 */
export function PostFeed({
  initial,
  initialTeam = "ALL",
  variant,
  header,
}: {
  initial?: InitialArticleFeed;
  initialTeam?: Filter;
  variant: PostListVariant;
  /**
   * 팀 탭 위에 함께 고정할 화면 제목 블록 (KAN-386, 기사 페이지 전용). 탭과 한
   * 덩어리로 GNB 아래 sticky라 리스트를 한참 내려도 제목·부제·탭이 전부 상단에
   * 남는다.
   */
  header?: ReactNode;
}) {
  const pathname = usePathname();
  const setFeedFilter = useViewState((state) => state.setFeedFilter);
  const filter =
    variant === "news"
      ? teamFilterFromPathname(pathname)
      : articlesTeamFilterFromPathname(pathname);
  const queryClient = useQueryClient();
  const refresh = useFeedRefresh();
  useScrollRestore(variant);

  /**
   * URL이 정한 필터를 스토어에 흘려 둔다 — 직접 진입·뒤로가기까지 포함해 GNB
   * 링크가 항상 지금 보는 탭을 가리키게 한다. 문서 제목도 여기서 맞춘다 —
   * replaceState는 서버 메타데이터를 다시 렌더하지 않아 탭을 바꿔도 제목이
   * 이전 페이지 것으로 남는다.
   */
  useEffect(() => {
    setFeedFilter(variant, filter);
    document.title =
      variant === "news" ? teamHubTitle(filter) : articlesTeamTitle(filter);
  }, [variant, filter, setFeedFilter]);

  /**
   * 탭 선택 — URL만 바꾸면 아래 파생이 필터·쿼리를 갈아 끼운다.
   *
   * 지금 있는 팀을 한 번 더 누르면 이동 대신 맨 위로 올리고 첫 페이지부터 다시
   * 받는다 — GNB 재클릭·모바일 하단 탭 재탭과 같은 손버릇이다. 다른 팀이면
   * 떠나는 팀에서 보던 위치를 적어 둔다(`scrollTops`가 스크롤마다 갱신되는
   * 현재 위치다). 이미 봤던 팀으로 되돌아오면 아래 이펙트가 이 값으로 복원한다.
   */
  function handleChange(next: Filter) {
    const state = useViewState.getState();
    if (next === filter) {
      state.setScrollTop(variant, 0);
      window.scrollTo({ top: 0 });
      void refresh(variant);
      return;
    }
    /* 홈은 팀 전환에 스크롤을 건드리지 않으므로 기억할 위치도 없다 (KAN-386) */
    if (variant === "article") {
      state.setArticleTabScrollTop(filter, state.scrollTops[variant] ?? 0);
    }
    const path =
      variant === "news" ? teamHubPath(next) : articlesTeamPath(next);
    window.history.replaceState(null, "", path);
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

  /**
   * `isFetchingNextPage`가 아니라 `isFetching`으로 막는다 — 다음 페이지뿐 아니라
   * 첫 페이지 refetch 중에도 트리거를 꺼야 한다 (KAN-404). 커서 400 복구
   * ({@link retryNextPage})가 첫 페이지를 다시 받는 동안 트리거가 살아나면,
   * 캐시에 남은 옛 첫 페이지의 죽은 커서로 fetchNextPage를 쏘고 그 기본
   * cancelRefetch가 복구 refetch를 취소해 400 루프에 갇힌다.
   */
  const sentinelRef = useInfiniteScroll(
    fetchNextPage,
    variant === "article" &&
      hasNextPage &&
      !isFetching &&
      !isFetchNextPageError,
  );

  /**
   * 탭 전환 뒤 스크롤 자리 잡기 — 기사(article)만 (KAN-386, 모바일 ArticlesFeed와
   * 같은 판단). 처음 여는 팀(캐시 없음, 스켈레톤부터 시작)은 맨 위에서 시작하고,
   * 이미 봤던 팀은 그 팀에서 보던 위치로 되돌린다.
   *
   * 전환 전 자리에 그대로 두면 안 된다 — 필터가 sticky라 리스트를 한참 내린
   * 채로도 탭을 바꿀 수 있는데, 새 팀 로딩으로 문서가 짧아졌다 다시 자라는
   * 동안 브라우저 스크롤 앵커링이 리스트 끝을 화면에 붙잡아 둬서 감시 요소가
   * 계속 보이고 다음 페이지 요청이 연쇄로 나간다.
   *
   * 홈(news)은 이 이펙트를 통째로 건너뛴다 — 리스트가 첫 페이지 고정이라 위의
   * 사정이 없고, 팀을 바꿔도 스크롤은 그 자리 그대로가 맞다.
   *
   * 마운트 첫 실행은 건너뛴다 — 화면을 떠났다 돌아올 때의 복원은
   * {@link useScrollRestore}가 맡는 다른 층이다.
   */
  const prevFilter = useRef(filter);
  useEffect(() => {
    if (prevFilter.current === filter) return;
    prevFilter.current = filter;
    if (variant !== "article") return;
    if (isPending) {
      useViewState.getState().setScrollTop(variant, 0);
      window.scrollTo({ top: 0 });
      return;
    }
    const saved = useViewState.getState().articleTabScrollTops[filter];
    if (saved != null) window.scrollTo({ top: saved });
  }, [filter, isPending, variant]);

  /* 홈은 기사 페이지와 캐시를 공유하므로 여러 페이지가 쌓여 있을 수 있다 — 첫 페이지 몫만 자른다 */
  const allArticles = data?.pages.flatMap((page) => page.items) ?? [];
  const articles =
    variant === "news" ? allArticles.slice(0, ARTICLES_PAGE_SIZE) : allArticles;

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

  const tabs = (
    <TeamFilterTabs
      value={filter}
      onChange={handleChange}
      hrefFor={variant === "news" ? teamHubPath : articlesTeamPath}
    />
  );

  return (
    <div className="min-w-0">
      {header ? (
        /* 제목 블록과 탭을 한 덩어리로 GNB(h-16) 아래 고정한다 (KAN-386). 탭
           자체의 sticky는 이 래퍼가 붙잡고 있는 동안 움직일 일이 없어 무해하다.
           top-[63px](GNB - 1px)는 소수점 스크롤의 픽셀 반올림 실금을 GNB 밑에
           1px 겹쳐 덮는 몫이다 */
        <div className="bg-bg sticky top-[63px] z-10">
          {header}
          {tabs}
        </div>
      ) : (
        tabs
      )}
      <div className={variant === "news" ? "pt-1.5 pb-6" : "pt-1.5"}>
        {isPending ? (
          Array.from({ length: SKELETON_COUNT[variant] }, (_, i) => (
            <PostListItemSkeleton key={i} variant={variant} />
          ))
        ) : isError && articles.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-body text-text-4">소식을 불러오지 못했어요.</p>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="bg-elevate text-label text-text rounded-control mt-3 px-4 py-2 font-bold transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              다시 시도
            </button>
          </div>
        ) : articles.length > 0 ? (
          <>
            {articles.map((post) => (
              <PostListItem
                key={post.id}
                post={post}
                variant={variant}
                filter={filter}
              />
            ))}

            {variant === "news" ? (
              /* 첫 페이지 밖 기사는 기사 페이지가 맡는다 (KAN-386) */
              <MoreArticlesLink variant="footer" />
            ) : (
              <>
                {isFetchingNextPage && (
                  <PostListItemSkeleton variant={variant} />
                )}

                {isFetchNextPageError && (
                  <div className="py-6 text-center">
                    <p className="text-caption text-text-4">
                      다음 소식을 불러오지 못했어요.
                    </p>
                    <button
                      type="button"
                      onClick={retryNextPage}
                      className="bg-elevate text-label text-text rounded-control mt-2 px-4 py-2 font-bold transition-opacity hover:opacity-80"
                    >
                      다시 시도
                    </button>
                  </div>
                )}

                {/* 이 자리가 보이면 다음 페이지를 당긴다. 마지막 페이지면 관찰을 끈다. */}
                <div ref={sentinelRef} aria-hidden className="h-px" />
              </>
            )}
          </>
        ) : (
          <p className="text-body text-text-4 py-12 text-center">
            아직 이 팀 소식이 없어요.
          </p>
        )}
      </div>
    </div>
  );
}

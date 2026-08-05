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
import {
  articlesTeamFilterFromPathname,
  articlesTeamPath,
  articlesTeamTitle,
} from "@/_utils/feed-paths";
import { ApiError } from "@plick/core/client";
import { articleKeys } from "@plick/core/articleKeys";
import { PostListItem } from "@/_components/PostListItem";
import { PostListItemSkeleton } from "@/_components/PostListItemSkeleton";
import { TeamFilterTabs } from "@/_components/TeamFilterTabs";
import { useArticleFeed } from "@/_hooks/useArticleFeed";
import { useInfiniteScroll } from "@/_hooks/useInfiniteScroll";
import { useScrollRestore } from "@/_hooks/useScrollRestore";
import { useViewState } from "@/_stores/view-state";
import type { PostListVariant } from "@/_types/app";

/** 첫 로딩에 보여줄 자리 개수 — 한 페이지 건수보다 적게 둬 화면을 덜 채운다. */
const SKELETON_COUNT = 4;

/**
 * 팀 필터 탭 + 팀별 기사 리스트를 묶는 클라이언트 컨테이너 (KAN-321).
 * 홈 "지금 올라온 소식"과 기사 페이지가 `variant`로 행 밀도만 바꿔 공용한다.
 *
 * 필터는 화면에서 거르지 않고 BE `teamId`로 넘겨 팀별 최신순 목록을 새로 받고
 * (KAN-271), 리스트 끝에 닿으면 커서로 다음 페이지를 잇는다. 전체 탭 첫 페이지는
 * 서버 컴포넌트가 미리 받아 `initial`로 내려주므로 첫 렌더에는 스켈레톤이 보이지
 * 않는다.
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
}: {
  initial?: InitialArticleFeed;
  initialTeam?: Filter;
  variant: PostListVariant;
}) {
  const pathname = usePathname();
  const setFeedFilter = useViewState((state) => state.setFeedFilter);
  const filter =
    variant === "news"
      ? teamFilterFromPathname(pathname)
      : articlesTeamFilterFromPathname(pathname);
  const queryClient = useQueryClient();
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

  /** 탭 선택 — URL만 바꾸면 위의 파생이 필터·쿼리를 갈아 끼운다 */
  function handleChange(next: Filter) {
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
    <div className="min-w-0">
      <TeamFilterTabs
        value={filter}
        onChange={handleChange}
        hrefFor={variant === "news" ? teamHubPath : articlesTeamPath}
      />
      <div className={variant === "news" ? "pt-1.5 pb-6" : "pt-1.5"}>
        {isPending ? (
          Array.from({ length: SKELETON_COUNT }, (_, i) => (
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

            {isFetchingNextPage && <PostListItemSkeleton variant={variant} />}

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
        ) : (
          <p className="text-body text-text-4 py-12 text-center">
            아직 이 팀 소식이 없어요.
          </p>
        )}
      </div>
    </div>
  );
}

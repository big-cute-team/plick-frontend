"use client";

/**
 * @file 라우트를 떠나도 살아남는 화면별 뷰 상태 (KAN-314).
 *
 * 홈에서 기사로 들어갔다 나오거나 하단 탭으로 릴스에 다녀오면 그 화면의 React
 * 트리는 언마운트된다. `useState`에 들고 있던 팀 필터나 스크롤 위치는 그때 사라진다.
 * Next의 Router Cache는 RSC 페이로드만 들고 있지 컴포넌트 상태를 보존하지 않으므로
 * 설정으로 막을 수 있는 일이 아니다. 트리 밖(모듈 스코프)에 두는 게 유일한 방법이다.
 *
 * 목록 데이터 자체는 TanStack Query 캐시가 들고 있고(`FEED_FRESH_MS` 동안 유지),
 * 여기 있는 건 그 데이터를 어디서 어떻게 보고 있었는지에 대한 값들뿐이다.
 *
 * persist를 붙이지 않는다. 새로고침으로 앱을 다시 여는 건 처음부터 보겠다는
 * 뜻이고, 그때 스크롤만 500px 내려가 있으면 오히려 이상하다.
 *
 * 스크롤 값은 스크롤할 때마다 바뀌므로 컴포넌트에서 셀렉터로 구독하지 않는다.
 * 구독하면 한 프레임마다 리렌더가 돈다. 필요한 순간에 `getState()`로 읽는다.
 * 반대로 `topTicks`는 구독해야 한다 — 탭 재탭을 화면에 전달하는 신호다.
 */

import { create } from "zustand";
import type { Filter } from "@plick/domain/types";
import type { ScreenKey } from "@/_types/app";

type ViewState = {
  /**
   * 홈 "지금 올라온 소식"의 팀 필터. KAN-350부터 원본은 URL이다
   * (`/` = 전체, `/teams/[slug]` = 그 팀) — NewsFeed가 URL에서 파생한 값을
   * 여기 동기화해 두고, 하단 탭의 홈 href(마지막으로 보던 팀 허브로 복귀)와
   * 당겨서 새로고침(지금 탭만 리셋)이 읽는다.
   */
  homeFilter: Filter;
  setHomeFilter: (filter: Filter) => void;
  /**
   * 기사 페이지의 팀 필터 (KAN-386). 홈과 같은 판단 — 원본은 URL이고
   * (`/articles` = 전체, `/articles/teams/[slug]` = 그 팀) ArticlesFeed가
   * 여기 동기화해 두면, 하단 탭의 기사 href(마지막으로 보던 팀으로 복귀)와
   * 당겨서 새로고침이 읽는다.
   */
  articlesFilter: Filter;
  setArticlesFilter: (filter: Filter) => void;
  /** 화면별 스크롤 오프셋(px) */
  scrollTops: Partial<Record<ScreenKey, number>>;
  setScrollTop: (key: ScreenKey, top: number) => void;
  /**
   * 기사 페이지 팀 탭별 스크롤 오프셋(px). 탭을 떠날 때 ArticlesFeed가 적어
   * 두고, 이미 봤던 팀으로 되돌아오면 그 팀에서 보던 자리로 복원한다.
   * `scrollTops.articles`는 화면 단위(기사 페이지를 떠났다 돌아올 때)
   * 복원용이라 따로 둔다.
   *
   * 홈에는 이 층이 없다 (KAN-386). 홈 리스트가 첫 페이지 고정으로 짧아지면서
   * 팀 전환 때 스크롤을 건드리지 않게 됐고, 그러면 팀별로 기억할 위치도 없다.
   */
  articlesTabScrollTops: Partial<Record<Filter, number>>;
  setArticlesTabScrollTop: (filter: Filter, top: number) => void;
  /** 릴스에서 보고 있던 릴의 순번 */
  reelsIndex: number;
  setReelsIndex: (index: number) => void;
  /**
   * 화면별 "맨 위로" 요청 횟수. 값 자체엔 의미가 없고 증가가 신호다.
   * 하단 탭 재탭이 올리고, 해당 화면이 구독하다가 바뀌면 맨 위로 올라간다.
   * 스크롤러(홈)와 캐러셀(릴스)은 명령하는 방법이 서로 달라서 값 하나를
   * 두고 각자 자기 방식으로 반응하게 했다.
   */
  topTicks: Record<ScreenKey, number>;
  requestTop: (key: ScreenKey) => void;
};

/** 화면별 뷰 상태 스토어 — 앱에서 유일한 zustand 스토어다. */
export const useViewState = create<ViewState>((set) => ({
  homeFilter: "ALL",
  setHomeFilter: (homeFilter) => set({ homeFilter }),

  articlesFilter: "ALL",
  setArticlesFilter: (articlesFilter) => set({ articlesFilter }),

  scrollTops: {},
  setScrollTop: (key, top) =>
    set((state) => ({ scrollTops: { ...state.scrollTops, [key]: top } })),

  articlesTabScrollTops: {},
  setArticlesTabScrollTop: (filter, top) =>
    set((state) => ({
      articlesTabScrollTops: { ...state.articlesTabScrollTops, [filter]: top },
    })),

  reelsIndex: 0,
  setReelsIndex: (reelsIndex) => set({ reelsIndex }),

  topTicks: { home: 0, reels: 0, articles: 0 },
  requestTop: (key) =>
    set((state) => ({
      topTicks: { ...state.topTicks, [key]: state.topTicks[key] + 1 },
    })),
}));

"use client";

/**
 * @file 라우트를 떠나도 살아남는 화면별 뷰 상태 (KAN-321, 모바일 KAN-314와 같은 판단).
 *
 * 피드에서 기사 상세로 들어갔다 나오면 그 화면의 React 트리는 언마운트된다.
 * `useState`에 들고 있던 팀 필터는 그때 사라져 '전체' 탭으로 초기화된다. Next의
 * Router Cache는 RSC 페이로드만 들고 있지 컴포넌트 상태를 보존하지 않으므로
 * 설정으로 막을 수 있는 일이 아니다. 트리 밖(모듈 스코프)에 두는 게 유일한 방법이다.
 *
 * 목록 데이터 자체는 TanStack Query 캐시가 들고 있고(`FEED_FRESH_MS` 동안 유지),
 * 여기 있는 건 어느 탭을 보고 있었는지뿐이다. 홈과 기사 페이지는 같은 피드를
 * 쓰지만 화면이 다르므로 탭 선택은 surface(`variant`)별로 따로 기억한다.
 *
 * persist를 붙이지 않는다. 새로고침으로 앱을 다시 여는 건 처음부터 보겠다는 뜻이다.
 */

import { create } from "zustand";
import type { Filter } from "@plick/domain/types";
import type { PostListVariant } from "@/_types/app";

type ViewState = {
  /** surface(홈 소식 리스트·기사 페이지)별 팀 필터 */
  feedFilters: Record<PostListVariant, Filter>;
  setFeedFilter: (surface: PostListVariant, filter: Filter) => void;
};

/** 화면별 뷰 상태 스토어 — 앱에서 유일한 zustand 스토어다. */
export const useViewState = create<ViewState>((set) => ({
  feedFilters: { news: "ALL", article: "ALL" },
  setFeedFilter: (surface, filter) =>
    set((state) => ({
      feedFilters: { ...state.feedFilters, [surface]: filter },
    })),
}));

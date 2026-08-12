"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { articleKeys } from "@plick/core/articleKeys";
import { restartFeedQuery } from "@plick/core/feed-refresh";
import { useViewState } from "@/_stores/view-state";

/**
 * 진행 중인 기사 페이지 갱신 (KAN-386, `useHomeRefresh`와 같은 판단). 탭 연타로
 * 갱신이 겹쳐 나가면 응답이 임의 순서로 도착하며 매번 화면을 갈아 끼워
 * 깜빡이므로, 도는 동안의 재호출은 같은 프로미스를 돌려주고 새 요청을 만들지
 * 않는다. 훅 인스턴스가 탭바와 기사 스크롤 영역 두 곳에 생겨서 ref가 아니라
 * 모듈 스코프에 둔다.
 */
let inFlight: Promise<void> | null = null;

/**
 * 기사 페이지를 처음부터 다시 받는다 (KAN-386) — 맨 위에서 당기거나 기사 탭을
 * 한 번 더 눌렀을 때 도는 동작. `useHomeRefresh`에서 필터만 기사 surface의
 * 것(`articlesFilter`)으로 바꾼 판박이다.
 *
 * 목록은 `restartFeedQuery`로 첫 페이지 하나만 다시 받는다 — `resetQueries`는
 * 씨앗이 다시 심겨 옛 목록이 스쳤다 간다(KAN-379). 서버 씨앗 몫은
 * `router.refresh()`로 함께 갱신한다.
 */
export function useArticlesRefresh() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useCallback(async () => {
    if (inFlight) return inFlight;
    // 지금 보고 있는 팀 탭만 다시 받는다. 필터 자체는 새로고침으로 건드리지 않는다
    const { articlesFilter } = useViewState.getState();
    router.refresh();
    inFlight = restartFeedQuery(
      queryClient,
      articleKeys.feed(articlesFilter),
    ).finally(() => {
      inFlight = null;
    });
    return inFlight;
  }, [queryClient, router]);
}

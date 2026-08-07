"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { articleKeys } from "@plick/core/articleKeys";
import { restartFeedQuery } from "@plick/core/feed-refresh";
import { useViewState } from "@/_stores/view-state";
import type { PostListVariant } from "@/_types/app";

/**
 * 진행 중인 피드 갱신 (KAN-379). GNB 재탭·당겨서 새로고침이 겹쳐 나가면 응답이
 * 임의 순서로 도착하며 화면을 여러 번 갈아 끼우므로, 도는 동안의 재호출은 같은
 * 프로미스를 돌려준다. 재탭과 당기기는 같은 화면에서만 일어나 surface별로
 * 나눠 잠글 실익이 없다.
 */
let inFlight: Promise<void> | null = null;

/**
 * 피드 화면을 처음부터 다시 받는다 (KAN-321, 모바일 `useHomeRefresh` KAN-314와
 * 같은 동작) — 지금 있는 페이지의 GNB 링크를 한 번 더 눌렀거나 좁은 화면에서
 * 맨 위를 당겼을 때(KAN-379) 돈다.
 *
 * 캐시 유지시간이 30분이라(`FEED_FRESH_MS`) 화면에 다시 들어와도 자동 갱신이
 * 걸리지 않는다. 이 손동작이 소프트 내비 중 유일한 갱신 통로이므로 여기서는
 * 확실하게 처음부터 다시 받는다.
 *
 * 목록은 `restartFeedQuery`로 첫 페이지 하나만 다시 받는다. 예전의
 * `resetQueries`는 캐시를 초기 상태로 되돌려 [보던 목록] → [씨앗/스켈레톤] →
 * [새 목록]으로 두 번 깜빡였다(KAN-379). 첫 페이지만 받는 이유와 커서 체인
 * 사정은 `restartFeedQuery` 주석 참고.
 *
 * 서버 컴포넌트 몫(핫이슈 그리드 등)은 `router.refresh()`로 함께 갱신한다.
 * 리로드가 아니라 서버에 RSC 페이로드를 다시 요청해 갈아 끼우는 소프트 갱신이라
 * 클라 상태(필터·스크롤)는 그대로 남는다.
 *
 * @returns surface를 받아 그 화면의 현재 팀 탭 피드를 다시 받는 콜백.
 *   surface가 없으면(피드 없는 페이지) 서버 갱신만 한다.
 */
export function useFeedRefresh() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useCallback(
    async (surface?: PostListVariant) => {
      if (inFlight) return inFlight;
      router.refresh();
      if (!surface) return;
      // 지금 보고 있는 팀 탭만 다시 받는다. 필터 자체는 새로고침으로 건드리지 않는다
      const filter = useViewState.getState().feedFilters[surface];
      inFlight = restartFeedQuery(
        queryClient,
        articleKeys.feed(filter),
      ).finally(() => {
        inFlight = null;
      });
      return inFlight;
    },
    [queryClient, router],
  );
}

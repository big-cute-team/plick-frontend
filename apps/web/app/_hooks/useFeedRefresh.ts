"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { articleKeys } from "@plick/core/articleKeys";
import { useViewState } from "@/_stores/view-state";
import type { PostListVariant } from "@/_types/app";

/**
 * 피드 화면을 처음부터 다시 받는다 (KAN-321, 모바일 `useHomeRefresh` KAN-314와
 * 같은 동작) — 지금 있는 페이지의 GNB 링크를 한 번 더 눌렀을 때 돈다.
 *
 * 캐시 유지시간이 30분이라(`FEED_FRESH_MS`) 화면에 다시 들어와도 자동 갱신이
 * 걸리지 않는다. 이 손동작이 소프트 내비 중 유일한 갱신 통로이므로 여기서는
 * 확실하게 처음부터 다시 받는다.
 *
 * `invalidateQueries`가 아니라 `resetQueries`인 이유: 무한 쿼리를 무효화하면 쌓인
 * 페이지를 전부 다시 받는데, 커서 체인이라 앞 페이지가 와야 다음 커서를 알 수 있어
 * 순차로 나간다. 리셋은 첫 페이지 하나만 받는다. 어차피 갱신과 함께 맨 위로
 * 올라가므로 뒷 페이지를 되살릴 이유도 없다.
 *
 * 서버 컴포넌트 몫(핫이슈 그리드 등)은 `router.refresh()`로 함께 갱신한다.
 * 리로드가 아니라 서버에 RSC 페이로드를 다시 요청해 갈아 끼우는 소프트 갱신이라
 * 클라 상태(필터·스크롤)는 그대로 남는다.
 *
 * @returns surface를 받아 그 화면의 현재 팀 탭 피드를 리셋하는 콜백.
 *   surface가 없으면(피드 없는 페이지) 서버 갱신만 한다.
 */
export function useFeedRefresh() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useCallback(
    async (surface?: PostListVariant) => {
      router.refresh();
      if (!surface) return;
      // 지금 보고 있는 팀 탭만 다시 받는다. 필터 자체는 새로고침으로 건드리지 않는다
      const filter = useViewState.getState().feedFilters[surface];
      await queryClient.resetQueries({ queryKey: articleKeys.feed(filter) });
    },
    [queryClient, router],
  );
}

"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { activityKeys } from "@plick/core/activityKeys";
import { restartFeedQuery } from "@plick/core/feed-refresh";
import { activityTabFrom } from "@/_utils/activity";

/**
 * 진행 중인 활동 화면 갱신. 당겨서 새로고침이 연달아 걸려도 새 요청을 만들지
 * 않고 같은 프로미스를 돌려준다(`useArticlesRefresh`와 같은 판단).
 */
let inFlight: Promise<void> | null = null;

/**
 * 활동 화면을 처음부터 다시 받는다 (KAN-495). 맨 위에서 당겼을 때 도는 동작.
 *
 * 지금 보는 탭의 목록만 `restartFeedQuery`로 첫 페이지 하나로 줄여 다시 받고,
 * 개수는 무효화해 함께 다시 센다. 어느 탭인지는 URL이 원본이라 부르는 순간의
 * 주소에서 읽는다. 훅이 탭바 밖(스크롤 영역 껍데기)에서도 만들어지기 때문이다.
 * 서버 씨앗 몫은 `router.refresh()`로 함께 갱신한다.
 */
export function useActivityRefresh() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useCallback(async () => {
    if (inFlight) return inFlight;
    const tab = activityTabFrom(
      new URLSearchParams(window.location.search).get("tab"),
    );
    router.refresh();
    inFlight = Promise.all([
      restartFeedQuery(
        queryClient,
        tab === "likes" ? activityKeys.likes() : activityKeys.comments(),
      ),
      queryClient.invalidateQueries({ queryKey: activityKeys.counts() }),
    ])
      .then(() => undefined)
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  }, [queryClient, router]);
}

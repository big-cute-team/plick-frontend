"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { reelKeys } from "@plick/core/reelKeys";
import { restartFeedQuery } from "@plick/core/feed-refresh";

/**
 * 진행 중인 릴스 갱신 (KAN-379). 탭 연타로 갱신이 겹치면 슬라이드 목록이
 * 응답마다 재구성되며 깜빡이므로, 도는 동안의 재호출은 같은 프로미스를
 * 돌려준다. `useHomeRefresh`와 같은 이유로 모듈 스코프다.
 */
let inFlight: Promise<void> | null = null;

/**
 * 릴스를 처음부터 다시 받는다 (KAN-314) — 릴스 탭을 한 번 더 눌렀을 때 도는 동작.
 *
 * 릴스에는 당겨서 새로고침을 붙이지 않는다. 세로 드래그는 이미 Embla 캐러셀이
 * 릴을 넘기는 데 쓰고 있어서 같은 제스처를 두 동작에 나눠 줄 수 없다.
 *
 * 목록은 홈과 같이 `restartFeedQuery`로 첫 페이지 하나만 다시 받는다(KAN-379).
 * 예전 `resetQueries`는 캐시를 씨앗으로 되돌렸다가 새로 받아 슬라이드가 두 번
 * 재구성됐다 — 페이지를 줄여 refetch하면 새 응답이 올 때까지 보던 릴이 남는다.
 */
export function useReelsRefresh() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useCallback(async () => {
    if (inFlight) return inFlight;
    router.refresh();
    inFlight = restartFeedQuery(queryClient, reelKeys.feed()).finally(() => {
      inFlight = null;
    });
    return inFlight;
  }, [queryClient, router]);
}

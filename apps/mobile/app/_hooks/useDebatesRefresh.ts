"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { debateKeys } from "@plick/core/debateKeys";
import { predictionKeys } from "@plick/core/predictionKeys";

/**
 * 진행 중인 토론 리스트 갱신 — 탭 연타로 겹치면 같은 프로미스를 돌려준다.
 * `useReelsRefresh`와 같은 이유로 모듈 스코프다.
 */
let inFlight: Promise<void> | null = null;

/** VS의 현재 탭에서 사용 중인 목록·랭킹을 갱신한다. */
export function useDebatesRefresh() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useCallback(async () => {
    if (inFlight) return inFlight;
    router.refresh();
    inFlight = Promise.all([
      queryClient.refetchQueries({
        queryKey: debateKeys.list(),
        type: "active",
      }),
      queryClient.refetchQueries({
        queryKey: predictionKeys.feed(),
        type: "active",
      }),
      queryClient.refetchQueries({
        queryKey: predictionKeys.rankings(),
        type: "active",
      }),
      queryClient.refetchQueries({
        queryKey: predictionKeys.myStats(),
        type: "active",
      }),
    ])
      .then(() => undefined)
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  }, [queryClient, router]);
}

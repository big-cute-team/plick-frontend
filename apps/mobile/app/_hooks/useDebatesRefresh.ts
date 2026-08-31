"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { debateKeys } from "@plick/core/debateKeys";

/**
 * 진행 중인 토론 리스트 갱신 — 탭 연타로 겹치면 같은 프로미스를 돌려준다.
 * `useReelsRefresh`와 같은 이유로 모듈 스코프다.
 */
let inFlight: Promise<void> | null = null;

/**
 * 토론 리스트를 다시 받는다 (KAN-418) — 토론 탭 재탭·당겨서 새로고침이 부른다.
 *
 * 피드류(`restartFeedQuery`)와 달리 페이지네이션 없는 단일 배열 쿼리라 페이지를
 * 줄일 것도 없다 — refetch 한 번이면 새 응답이 올 때까지 보던 리스트가 남는다.
 */
export function useDebatesRefresh() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useCallback(async () => {
    if (inFlight) return inFlight;
    router.refresh();
    inFlight = queryClient
      .refetchQueries({ queryKey: debateKeys.list() })
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  }, [queryClient, router]);
}

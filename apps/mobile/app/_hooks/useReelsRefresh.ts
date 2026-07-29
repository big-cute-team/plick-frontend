"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { reelKeys } from "@plick/core/reelKeys";

/**
 * 릴스를 처음부터 다시 받는다 (KAN-314) — 릴스 탭을 한 번 더 눌렀을 때 도는 동작.
 *
 * 릴스에는 당겨서 새로고침을 붙이지 않는다. 세로 드래그는 이미 Embla 캐러셀이
 * 릴을 넘기는 데 쓰고 있어서 같은 제스처를 두 동작에 나눠 줄 수 없다.
 *
 * 홈과 같은 이유로 `resetQueries`다 — 무한 쿼리 무효화는 쌓인 페이지를 커서
 * 순서대로 전부 다시 받는다(`useHomeRefresh` 주석 참고).
 */
export function useReelsRefresh() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useCallback(async () => {
    router.refresh();
    await queryClient.resetQueries({ queryKey: reelKeys.feed() });
  }, [queryClient, router]);
}

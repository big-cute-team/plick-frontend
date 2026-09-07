"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { getPlayerSeasonStats } from "@plick/core/live";
import { liveKeys } from "@plick/core/liveKeys";
import type { PlayerSeasonStats } from "@plick/domain/live";
import { LIVE_MAX_RETRIES } from "@/_constants/live";

/**
 * 선수 시즌 스탯 쿼리 (KAN-452) — 시트가 열릴 때만 받는다. BE 캐시가 24시간이라
 * 세션 안에서는 다시 받지 않는다.
 */
export function usePlayerSeasonStats(playerId: number) {
  return useSuspenseQuery<PlayerSeasonStats>({
    queryKey: liveKeys.playerSeasonStats(playerId),
    queryFn: () => getPlayerSeasonStats(playerId),
    staleTime: Infinity,
    retry: LIVE_MAX_RETRIES,
  });
}

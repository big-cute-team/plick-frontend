"use client";

import { useQuery } from "@tanstack/react-query";
import { getPlayerMatchStats } from "@plick/core/live";
import { liveKeys } from "@plick/core/liveKeys";
import type { PlayerMatchStats } from "@plick/domain/live";
import { LIVE_MAX_RETRIES } from "@/_constants/live";

/**
 * 선수 경기 스탯 쿼리 (KAN-452) — 모달이 열려 있을 때(`playerId`가 있을 때)만
 * 받는다. 라이브면 열 때마다 다시 받고 종료 경기는 값이 굳어 있어 세션 동안 둔다.
 */
export function usePlayerMatchStats(
  matchId: number,
  playerId: number | null,
  live: boolean,
) {
  return useQuery<PlayerMatchStats>({
    queryKey: liveKeys.playerMatchStats(matchId, playerId ?? 0),
    queryFn: () => getPlayerMatchStats(matchId, playerId ?? 0),
    enabled: playerId !== null,
    staleTime: live ? 0 : Infinity,
    retry: LIVE_MAX_RETRIES,
  });
}

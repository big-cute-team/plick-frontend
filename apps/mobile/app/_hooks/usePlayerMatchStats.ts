"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { getPlayerMatchStats } from "@plick/core/live";
import { liveKeys } from "@plick/core/liveKeys";
import type { PlayerMatchStats } from "@plick/domain/live";
import { LIVE_MAX_RETRIES } from "@/_constants/live";

/**
 * 선수 경기 스탯 쿼리 (KAN-452) — 시트 본문이 마운트될 때(=열릴 때)만 받는다.
 * 시트가 닫히면 본문이 언마운트되므로 `enabled` 없이도 열릴 때만 부른다.
 * 종료 경기는 값이 굳어 있어 오래 신선하게 두고, 라이브는 시트를 다시 열면
 * 다시 받는다.
 */
export function usePlayerMatchStats(
  matchId: number,
  playerId: number,
  live: boolean,
) {
  return useSuspenseQuery<PlayerMatchStats>({
    queryKey: liveKeys.playerMatchStats(matchId, playerId),
    queryFn: () => getPlayerMatchStats(matchId, playerId),
    staleTime: live ? 0 : Infinity,
    retry: LIVE_MAX_RETRIES,
  });
}

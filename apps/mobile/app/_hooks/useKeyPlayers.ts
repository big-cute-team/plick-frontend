"use client";

import { useQuery } from "@tanstack/react-query";
import { predictionKeys } from "@plick/core/predictionKeys";
import { getKeyPlayers } from "@plick/core/predictions";
import type { KeyPlayers } from "@plick/domain/prediction";
import { LIVE_MAX_RETRIES } from "@/_constants/live";

/**
 * 경기 하나의 키플레이어와 VS 스탯 쿼리 (KAN-699). 프리뷰 탭의 키플레이어 묶음이 쓴다.
 *
 * 경기 상세가 익명 ISR이라(KAN-683) 서버가 받아 둔 씨앗은 토큰 없이 받은 값이고 `myVote`가 비어 있다.
 * 그 값으로 첫 그림을 바로 그리고, 마운트되면 브라우저가 `/be` 프록시로 다시 받아 내 표를 채운다
 * (`usePredictionSummary`와 같은 구조). 투표 응답이 GET과 같은 모양이라 뮤테이션이 캐시를 바로 덮고,
 * 폴링은 두지 않는다. 득표는 분포처럼 빠르게 움직이는 값이 아니고 가이드 §8도 투표 때만 다시 받는다.
 *
 * null은 404 `PREDICTION_NOT_AVAILABLE`(빅6 밖 경기)이라 묶음을 그리지 않는다. 실패해도 프리뷰의 다른
 * 블록은 멀쩡해야 하므로 경계로 던지지 않는다.
 *
 * @param matchId 경기 id
 * @param initial 서버가 받아 둔 값. null은 예측 없는 경기, undefined는 서버가 못 받은 것
 */
export function useKeyPlayers(
  matchId: number,
  initial: KeyPlayers | null | undefined,
) {
  return useQuery<KeyPlayers | null>({
    queryKey: predictionKeys.keyPlayers(matchId),
    queryFn: () => getKeyPlayers(matchId),
    ...(initial !== undefined && { initialData: initial }),
    staleTime: 0,
    retry: LIVE_MAX_RETRIES,
    throwOnError: false,
  });
}

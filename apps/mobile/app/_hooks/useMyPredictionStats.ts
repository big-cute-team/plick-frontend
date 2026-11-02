"use client";

import { useQuery } from "@tanstack/react-query";
import { predictionKeys } from "@plick/core/predictionKeys";
import { getMyPredictionStats } from "@plick/core/predictions";
import type { MyPredictionStats } from "@plick/domain/prediction";

/**
 * 내 적중률·순위·예측 수 쿼리 (KAN-700). 홈 승부예측 제목 오른쪽의 `128위`가 쓴다. `GET
 * /me/prediction-stats`는 토큰이 없으면 401이라 소셜 계정일 때만 켠다(`enabled`). 게스트와
 * 비로그인은 부르지 않고 화면이 `랭킹`으로 둔다. 유저별 값이라 서버 씨앗 없이 브라우저에서만 받고,
 * 예측 등록·취소 뒤 `invalidateAfterPredictionWrite`가 상위 키(`mine`)로 다시 받는다.
 *
 * 순위는 정산 때만 바뀌어 한 번 받으면 잠시 둬도 된다(`staleTime` 1분). 실패해도 홈을 에러로
 * 만들지 않고 `랭킹`으로 접는다.
 *
 * @param enabled 소셜 계정으로 로그인했는가
 */
export function useMyPredictionStats(enabled: boolean) {
  return useQuery<MyPredictionStats>({
    queryKey: predictionKeys.myStats(),
    queryFn: () => getMyPredictionStats(),
    enabled,
    staleTime: 60_000,
    retry: false,
    throwOnError: false,
  });
}

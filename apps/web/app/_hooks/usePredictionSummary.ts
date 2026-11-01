"use client";

import { useQuery } from "@tanstack/react-query";
import { predictionKeys } from "@plick/core/predictionKeys";
import { getPredictionSummary } from "@plick/core/predictions";
import {
  PREDICTION_DISTRIBUTION_REFRESH_MS,
  type PredictionSummary,
} from "@plick/domain/prediction";
import { LIVE_MAX_RETRIES } from "@/_constants/live";

/**
 * 경기 하나의 예측 요약 쿼리 (KAN-696). 예측 탭 상단(상태 줄, 참여 수, 3분할 바, 내 예측)과
 * "예측 탭을 만들 경기인가"의 판정이 이 값에 걸린다.
 *
 * 경기 상세는 익명 ISR이라(KAN-683) 서버가 받아 둔 요약은 토큰 없이 받은 값이다. OPEN이면
 * `revealed: false`고 `myPrediction`도 없다. 그 값을 씨앗으로 심어 탭 유무와 첫 그림은 바로
 * 정하고, 마운트되면 브라우저가 `/be` 프록시로 다시 받는다. 프록시가 Bearer를 실어 주므로 그때
 * 내 예측과 분포가 그 사람 기준으로 온다(`useArticleDebate`와 같은 구조). `staleTime`이 0이라
 * 들어올 때마다 다시 받는다.
 *
 * OPEN과 LOCKED는 분포가 움직이는 상태라 30초마다 다시 받는다(BE 분포 캐시와 같은 간격, 가이드
 * §8). 정산·취소·미개장은 바뀔 게 없어 폴링하지 않는다.
 *
 * null은 404 `PREDICTION_NOT_AVAILABLE`(빅6 밖 경기)이라 탭을 만들지 않는다. 그 밖의 실패는
 * 씨앗이 남아 있으면 그대로 두고, 씨앗도 없으면 탭이 서지 않는다. 요약 하나 때문에 경기 화면이
 * 에러로 바뀌면 안 되므로 경계로 던지지 않는다.
 *
 * @param matchId 경기 id
 * @param initial 서버가 받아 둔 요약. null은 예측 없는 경기, undefined는 서버가 못 받은 것
 */
export function usePredictionSummary(
  matchId: number,
  initial: PredictionSummary | null | undefined,
) {
  return useQuery<PredictionSummary | null>({
    queryKey: predictionKeys.summary(matchId),
    queryFn: () => getPredictionSummary(matchId),
    ...(initial !== undefined && { initialData: initial }),
    staleTime: 0,
    retry: LIVE_MAX_RETRIES,
    throwOnError: false,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "OPEN" || status === "LOCKED"
        ? PREDICTION_DISTRIBUTION_REFRESH_MS
        : false;
    },
  });
}

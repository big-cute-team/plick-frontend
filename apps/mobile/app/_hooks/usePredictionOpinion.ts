"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@plick/core/client";
import { predictionKeys } from "@plick/core/predictionKeys";
import { getPredictionOpinion } from "@plick/core/predictions";
import { FEED_MAX_RETRIES } from "@/_constants/feed";

/**
 * 의견 하나 조회 (KAN-698, 시안 가이드 §5.6 "앱: 의견 상세 화면"). `GET /predictions/{id}`로 원 의견
 * 전문과 경기 id를 받는다. 앱 전용이다. 웹은 행 아래로 펼쳐 목록 항목을 그대로 쓴다.
 *
 * 브라우저에서만 받는다. 잠금 여부와 `likedByMe`가 사람마다 달라 서버 HTML에 둘 수 없고, 마운트
 * 뒤 `/be` 프록시가 토큰을 실어 받는다. 목록에서 들어왔으면 캐시에 같은 의견이 있지만 키가 달라
 * (목록은 정렬·필터별 페이지) 따로 받는다. 한 건이라 비용이 작고 `staleTime` 0이다.
 *
 * OPEN에서 예측하지 않은 사용자는 403 `PREDICTION_LOCKED`, 없거나 가려진 의견은 404로 온다
 * (티켓 완료 조건). 화면이 `classifyPredictionError`로 가른다. 4xx는 재시도하지 않는다.
 *
 * @param predictionId 의견 id
 */
export function usePredictionOpinion(predictionId: number) {
  return useQuery({
    queryKey: predictionKeys.opinion(predictionId),
    queryFn: () => getPredictionOpinion(predictionId),
    staleTime: 0,
    /* 403 잠금과 404는 화면이 문구로 받는다. 앱 기본값(데이터 없는 실패는 경계로)을 끈다 */
    throwOnError: false,
    retry: (failureCount, error) => {
      if (
        error instanceof ApiError &&
        error.status >= 400 &&
        error.status < 500
      ) {
        return false;
      }
      return failureCount < FEED_MAX_RETRIES;
    },
  });
}

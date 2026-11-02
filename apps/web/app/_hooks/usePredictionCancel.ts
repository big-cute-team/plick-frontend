"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@plick/core/client";
import { clearPredictionDraft } from "@plick/core/prediction-draft";
import {
  classifyPredictionError,
  type PredictionFailure,
} from "@plick/core/prediction-errors";
import { invalidateAfterPredictionWrite } from "@plick/core/prediction-sync";
import { cancelPrediction } from "@/_services/prediction-actions";

/**
 * 예측 취소 뮤테이션 (KAN-696). 내 예측 상자의 취소를 확인 시트에서 확정하면 부른다.
 *
 * 응답이 204라 덮을 값이 없어 요약, 그 경기 의견, 홈 카드, 내 기록을 다시 받는다
 * (`invalidateAfterPredictionWrite`). 요약은 `revealed: false`로 돌아와 바가 `?%`로, 의견은
 * 잠금으로 바뀐다. 쓰다 둔 임시 저장도 지운다.
 *
 * 실패는 `classifyPredictionError`로 종류를 가른 뒤 `onFailure`로 돌려준다. 마감 뒤 취소(409
 * `PREDICTION_CLOSED`)는 토스트와 함께 요약을 다시 받아 LOCKED 화면으로 넘어간다. 그 밖은
 * BE 문구를 시트 안에 남겨 다시 시도할 수 있게 한다.
 *
 * @param matchId 경기 id
 * @param onFailure 분류된 실패를 받는다
 */
export function usePredictionCancel(
  matchId: number,
  onFailure: (failure: PredictionFailure) => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    /* 실패 안내는 시트가 완결 처리한다. 전역 안전망 토스트 제외 (KAN-447) */
    meta: { errorHandled: true },
    mutationFn: async () => {
      const result = await cancelPrediction(matchId);
      if (!result.ok) {
        throw new ApiError(result.status, result.code, result.message);
      }
      return result.data;
    },
    onSuccess: () => {
      clearPredictionDraft(matchId);
      void invalidateAfterPredictionWrite(queryClient, matchId);
    },
    onError: (error) => {
      const failure = classifyPredictionError(error);
      if (failure.kind === "closed") {
        void invalidateAfterPredictionWrite(queryClient, matchId);
      }
      onFailure(failure);
    },
  });
}

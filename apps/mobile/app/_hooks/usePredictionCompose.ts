"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@plick/core/client";
import { clearPredictionDraft } from "@plick/core/prediction-draft";
import {
  classifyPredictionError,
  refetchesSummaryAfter,
  type PredictionFailure,
} from "@plick/core/prediction-errors";
import { predictionKeys } from "@plick/core/predictionKeys";
import type {
  PredictionPick,
  PredictionSummary,
} from "@plick/domain/prediction";
import { upsertPrediction } from "@/_services/prediction-actions";

/**
 * 예측 등록·수정 뮤테이션 (KAN-696). 작성 시트가 등록 버튼에서 부른다.
 *
 * 성공 응답이 요약과 같은 모양이라 요약 캐시를 응답으로 바로 덮는다(티켓 완료 조건 "재조회 없이
 * 화면 갱신"). 바는 `?%`에서 실제 비율로 transition하고 내 예측 상자가 선다. 요약을 무효화하지는
 * 않는다. BE가 분포를 30초 캐시해서 바로 다시 받으면 내 표가 빠진 옛 분포가 응답을 덮어 숫자가
 * 되돌아갈 수 있다. 30초 폴링(`usePredictionSummary`)이 다음 차례에 맞춘다. 그래서 core의
 * `invalidateAfterPredictionWrite`(요약까지 무효화) 대신 나머지 셋만 여기서 무효화한다. 의견
 * 목록은 잠금이 풀리며 통째로 바뀌고, 홈 카드와 내 기록은 다른 경기까지 섞여 있어 다시 받는다.
 *
 * 실패는 `classifyPredictionError`로 종류를 가른 뒤 `onFailure`로 돌려준다. 시트가 종류별로
 * 로그인 시트, 연동 안내, 입력란 안내, 토스트를 고른다. 마감·미개장(409)은 화면이 들고 있던
 * 상태가 서버와 어긋난 것이라 요약을 다시 받아 상태 줄과 바를 맞춘다. 서버 액션은 실패를 값으로
 * 돌려주므로 여기서 `ApiError`로 되살려 던진다.
 *
 * 세션 게이트(`ensureSession`)는 쓰지 않는다. 예측은 소셜 계정만 쓸 수 있어 게스트를 받아 와도
 * 403으로 막히고, 그 403이 바로 연동 안내다.
 *
 * @param matchId 경기 id
 * @param onFailure 분류된 실패를 받는다. 시트가 종류별 분기를 한다
 */
export function usePredictionCompose(
  matchId: number,
  onFailure: (failure: PredictionFailure) => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    /* 실패 안내는 시트가 완결 처리한다. 전역 안전망 토스트 제외 (KAN-447) */
    meta: { errorHandled: true },
    mutationFn: async (input: { pick: PredictionPick; opinion: string }) => {
      const result = await upsertPrediction(matchId, input.pick, input.opinion);
      if (!result.ok) {
        throw new ApiError(result.status, result.code, result.message);
      }
      return result.data;
    },
    onSuccess: (summary: PredictionSummary) => {
      queryClient.setQueryData(predictionKeys.summary(matchId), summary);
      clearPredictionDraft(matchId);
      void queryClient.invalidateQueries({
        queryKey: predictionKeys.opinionsOf(matchId),
      });
      void queryClient.invalidateQueries({ queryKey: predictionKeys.home() });
      void queryClient.invalidateQueries({ queryKey: predictionKeys.mine() });
    },
    onError: (error) => {
      const failure = classifyPredictionError(error);
      if (refetchesSummaryAfter(failure.kind)) {
        void queryClient.invalidateQueries({
          queryKey: predictionKeys.summary(matchId),
        });
      }
      onFailure(failure);
    },
  });
}

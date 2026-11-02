"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@plick/core/client";
import { invalidateAfterReplyWrite } from "@plick/core/prediction-sync";
import { createPredictionReply } from "@/_services/prediction-actions";

/**
 * 예측 답글 등록 뮤테이션 (KAN-698, 시안 가이드 §8 "답글 등록 → 다시 받는다"). 웹과 같은 구현이다.
 *
 * 댓글 등록(`useCreateComment`)은 201 응답을 캐시에 끼워 넣지만 여기서는 목록을 다시 받는다.
 * 답글은 오래된 순이라 끼울 자리가 마지막 페이지 끝인데, 아직 안 받은 다음 페이지가 있으면 그
 * 자리가 틀리고, `replyCount`를 든 의견 캐시(목록 여러 개와 의견 하나)도 같이 맞춰야 한다. 한
 * 페이지 50건이라 다시 받는 비용이 작다. 범위는 core `invalidateAfterReplyWrite`가 정한다.
 *
 * 서버 액션은 실패를 값으로 돌려주므로 `ApiError`로 되살려 던진다. 호출부가
 * `classifyPredictionError`로 가른다. 비로그인 401은 로그인 시트, 게스트 403은 연동 안내,
 * 금칙어 400 `PREDICTION_REPLY_BLOCKED`는 입력란에 문구를 남긴다.
 *
 * @param matchId 답글이 달린 의견의 경기. 의견 목록 캐시를 무효화하는 데 쓴다
 * @param predictionId 답글을 달 의견
 */
export function useCreatePredictionReply(
  matchId: number,
  predictionId: number,
) {
  const queryClient = useQueryClient();

  return useMutation({
    /* 콜사이트가 에러 UI를 완결 처리한다. 전역 안전망 토스트 제외 (KAN-447) */
    meta: { errorHandled: true },
    mutationFn: async (content: string) => {
      const result = await createPredictionReply(predictionId, content);
      if (!result.ok) {
        throw new ApiError(result.status, result.code, result.message);
      }
      return result.data;
    },
    onSuccess: () =>
      invalidateAfterReplyWrite(queryClient, matchId, predictionId),
  });
}

"use client";

import type { InfiniteData } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@plick/core/client";
import {
  invalidateAfterReplyWrite,
  removeReply,
} from "@plick/core/prediction-sync";
import { predictionKeys } from "@plick/core/predictionKeys";
import type { PredictionReplyPage } from "@plick/domain/prediction";
import { deletePredictionReply } from "@/_services/prediction-actions";

/**
 * 내 답글 삭제 뮤테이션 (KAN-698, 티켓 완료 조건 "삭제 204 처리"). 모바일과 같은 구현이다.
 *
 * 204라 덮을 값이 없다. 댓글은 지운 자리를 tombstone으로 남기지만 답글은 BE 목록에서 사라지므로
 * 캐시에서 바로 빼고(core `removeReply`), `replyCount`를 든 의견 캐시는 다시 받는다
 * (`invalidateAfterReplyWrite`). 답글 목록도 같이 무효화되지만 이미 뺀 뒤라 깜빡임이 없다.
 *
 * @param matchId 답글이 달린 의견의 경기
 * @param predictionId 답글이 달린 의견
 */
export function useDeletePredictionReply(
  matchId: number,
  predictionId: number,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (replyId: number) => {
      const result = await deletePredictionReply(replyId);
      if (!result.ok) {
        throw new ApiError(result.status, result.code, result.message);
      }
      return replyId;
    },
    onSuccess: (replyId) => {
      queryClient.setQueryData<
        InfiniteData<PredictionReplyPage, string | null>
      >(predictionKeys.replies(predictionId), (data) =>
        removeReply(data, replyId),
      );
      return invalidateAfterReplyWrite(queryClient, matchId, predictionId);
    },
  });
}

"use client";

import type { InfiniteData } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@plick/core/client";
import { applyReplyUpdate } from "@plick/core/prediction-sync";
import { predictionKeys } from "@plick/core/predictionKeys";
import type { PredictionReplyPage } from "@plick/domain/prediction";
import { updatePredictionReply } from "@/_services/prediction-actions";

/**
 * 내 답글 수정 뮤테이션 (KAN-698). 모바일과 같은 구현이다. PATCH가 답글 한 건을 같은 모양으로
 * 돌려주고 `replyCount`는 안 변하니 다시 받지 않고 캐시의 그 답글만 응답으로 덮는다(core
 * `applyReplyUpdate`). 댓글 수정(`useUpdateComment`)과 같은 판단이다.
 *
 * 남의 답글 403 `PREDICTION_REPLY_FORBIDDEN`과 지워진 답글 404는 화면이 내 글에만 수정을
 * 그려 보통 닿지 않고, 와도 호출부가 문구만 띄운다.
 *
 * @param predictionId 답글이 달린 의견. 캐시 키를 만드는 데 쓴다
 */
export function useUpdatePredictionReply(predictionId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      replyId,
      content,
    }: {
      replyId: number;
      content: string;
    }) => {
      const result = await updatePredictionReply(replyId, content);
      if (!result.ok) {
        throw new ApiError(result.status, result.code, result.message);
      }
      return result.data;
    },
    onSuccess: (reply) => {
      queryClient.setQueryData<
        InfiniteData<PredictionReplyPage, string | null>
      >(predictionKeys.replies(predictionId), (data) =>
        applyReplyUpdate(data, reply),
      );
    },
  });
}

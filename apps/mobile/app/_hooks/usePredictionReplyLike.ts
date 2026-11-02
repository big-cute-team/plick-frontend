"use client";

import type { InfiniteData } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { applyReplyLike } from "@plick/core/prediction-sync";
import { predictionKeys } from "@plick/core/predictionKeys";
import type {
  PredictionReply,
  PredictionReplyPage,
} from "@plick/domain/prediction";
import { useLikeToggle } from "@/_hooks/useLikeToggle";
import { likePredictionReply } from "@/_services/prediction-actions";

/**
 * 예측 답글 공감 토글 (KAN-698). `usePredictionOpinionLike`와 같은 구조이고 웹과 같은 구현이다.
 * 원본은 답글 무한 쿼리 캐시 하나라 그 키만 `setQueryData`로 덮고, 덮는 일은 core의
 * `applyReplyLike`가 한다. 공감은 게스트도 된다.
 *
 * @param predictionId 이 답글이 달린 의견 id. 캐시 키를 만드는 데 쓴다
 * @param reply 대상 답글. 공감 상태를 여기서 읽는다(원본이 캐시라 항상 최신)
 */
export function usePredictionReplyLike(
  predictionId: number,
  reply: PredictionReply,
) {
  const queryClient = useQueryClient();

  return useLikeToggle({
    toggle: async (liked) => {
      const result = await likePredictionReply(reply.id, liked);
      return result.ok
        ? { ok: true, likeCount: result.data.likeCount }
        : result;
    },
    state: { liked: reply.liked, likeCount: reply.likeCount },
    onChange: (next) => {
      queryClient.setQueryData<
        InfiniteData<PredictionReplyPage, string | null>
      >(predictionKeys.replies(predictionId), (data) =>
        applyReplyLike(data, reply.id, next),
      );
    },
  });
}

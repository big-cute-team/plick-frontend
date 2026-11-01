"use client";

import type { InfiniteData } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { applyOpinionLike } from "@plick/core/prediction-sync";
import { predictionKeys } from "@plick/core/predictionKeys";
import type {
  PredictionOpinion,
  PredictionOpinionPage,
} from "@plick/domain/prediction";
import { useLikeToggle } from "@/_hooks/useLikeToggle";
import { likePredictionOpinion } from "@/_services/prediction-actions";

/**
 * 예측 의견 공감 토글 (KAN-697, 시안 가이드 §8 "공감: 낙관적 갱신, 실패 시 되돌림").
 * {@link useLikeToggle}에 의견판 원본 갱신을 물린다. 댓글의 `useCommentLike`와 같은 구조이고 웹과
 * 같은 구현이다.
 *
 * 원본은 의견 무한 쿼리 캐시다. 같은 의견이 정렬·픽 필터별 캐시 여러 개에 살아 있을 수 있어
 * 경기 상위 키(`opinionsOf`)로 전부 훑고, 덮는 일은 core의 `applyOpinionLike`가 한다. 공감
 * 응답(`likeCount`, `likedByMe`)으로 바로 확정하고 재조회는 하지 않는다(티켓 완료 조건).
 *
 * 공감은 게스트도 된다. 서버 액션이 돌려주는 결과는 `{ data: { liked, likeCount } }` 모양이라
 * `useLikeToggle`이 기대하는 `{ likeCount }`로 접어 넘긴다. OPEN에서 예측하지 않은 사용자의
 * 403 `PREDICTION_LOCKED`는 화면이 잠금 지면을 그려 하트가 안 보이니 여기까지 오지 않고,
 * 와도 되돌리기만 한다.
 *
 * @param matchId 이 의견이 달린 경기 id. 캐시 상위 키를 만드는 데 쓴다
 * @param opinion 대상 의견. 공감 상태를 여기서 읽는다(원본이 캐시라 항상 최신)
 */
export function usePredictionOpinionLike(
  matchId: number,
  opinion: PredictionOpinion,
) {
  const queryClient = useQueryClient();

  return useLikeToggle({
    toggle: async (liked) => {
      const result = await likePredictionOpinion(opinion.id, liked);
      return result.ok
        ? { ok: true, likeCount: result.data.likeCount }
        : result;
    },
    state: { liked: opinion.liked, likeCount: opinion.likeCount },
    onChange: (next) => {
      queryClient.setQueriesData<
        InfiniteData<PredictionOpinionPage, string | null>
      >({ queryKey: predictionKeys.opinionsOf(matchId) }, (data) =>
        applyOpinionLike(data, opinion.id, next),
      );
    },
  });
}

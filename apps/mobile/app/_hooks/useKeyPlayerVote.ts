"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@plick/core/client";
import {
  classifyPredictionError,
  refetchesSummaryAfter,
  type PredictionFailure,
} from "@plick/core/prediction-errors";
import { predictionKeys } from "@plick/core/predictionKeys";
import type { KeyPlayerSide, KeyPlayers } from "@plick/domain/prediction";
import { voteKeyPlayer } from "@/_services/prediction-actions";

/**
 * 키플레이어 투표 뮤테이션 (KAN-699). 후보 목록에서 선수를 누르면 부른다. 팀별 1표 UPSERT라 다른
 * 선수를 누르면 표가 옮겨 간다.
 *
 * 응답이 GET과 같은 모양이라 키플레이어 캐시를 응답으로 바로 덮는다(티켓 완료 조건 "재조회 없이 갱신").
 * 득표율과 대표 선수, `myVote`가 한 번에 바뀐다.
 *
 * 실패는 `classifyPredictionError`로 종류를 가른 뒤 `onFailure`로 돌려준다. 마감(409)은 화면이 들고 있던
 * 상태가 서버와 어긋난 것이라 키플레이어와 요약을 다시 받아 투표 버튼을 걷고 상태 줄을 맞춘다. 스쿼드 밖
 * 선수(400)는 후보 목록이 묵은 것이라 키플레이어를 다시 받는다. 비로그인 401은 화면이 로그인 시트로
 * 보낸다. 게스트도 투표할 수 있어 연동 안내는 오지 않는다.
 *
 * @param matchId 경기 id
 * @param onFailure 분류된 실패를 받는다. 화면이 종류별 분기를 한다
 */
export function useKeyPlayerVote(
  matchId: number,
  onFailure: (failure: PredictionFailure) => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    /* 실패 안내는 화면이 완결 처리한다. 전역 안전망 토스트 제외 (KAN-447) */
    meta: { errorHandled: true },
    mutationFn: async (input: { side: KeyPlayerSide; playerId: number }) => {
      const result = await voteKeyPlayer(matchId, input.side, input.playerId);
      if (!result.ok) {
        throw new ApiError(result.status, result.code, result.message);
      }
      return result.data;
    },
    onSuccess: (players: KeyPlayers) => {
      queryClient.setQueryData(predictionKeys.keyPlayers(matchId), players);
    },
    onError: (error) => {
      const failure = classifyPredictionError(error);
      if (
        refetchesSummaryAfter(failure.kind) ||
        failure.kind === "not-in-squad"
      ) {
        void queryClient.invalidateQueries({
          queryKey: predictionKeys.keyPlayers(matchId),
        });
      }
      if (refetchesSummaryAfter(failure.kind)) {
        void queryClient.invalidateQueries({
          queryKey: predictionKeys.summary(matchId),
        });
      }
      onFailure(failure);
    },
  });
}

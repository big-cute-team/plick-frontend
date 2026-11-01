"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { ApiError } from "@plick/core/client";
import { predictionKeys } from "@plick/core/predictionKeys";
import { getPredictionReplies } from "@plick/core/predictions";
import { FEED_MAX_RETRIES } from "@/_constants/feed";

/**
 * 의견 하나의 답글 목록 무한 쿼리 (KAN-698, 시안 가이드 §5.6·§8). 오래된 순이고 한 페이지 50건이라
 * 보통 한 번에 다 온다. 웹과 같은 구현이다.
 *
 * 브라우저에서만 받는다. `likedByMe`와 `isMine`이 사람마다 달라 서버 HTML에 둘 수 없고, 마운트
 * 뒤 `/be` 프록시가 토큰을 실어 받는다. BE가 캐시하지 않는 값이라 `staleTime`은 0이다. 답글
 * 등록·삭제 뒤에는 `invalidateAfterReplyWrite`가 통째로 다시 받고, 수정과 공감은 캐시를 바로 덮는다.
 *
 * OPEN에서 예측하지 않은 사용자가 의견을 직접 열면 403 `PREDICTION_LOCKED`, 없거나 가려진
 * 의견은 404로 온다. 4xx는 다시 보내도 같은 답이라 순단만 재시도한다.
 *
 * @param predictionId 의견 id
 * @param enabled 펼치기 전(웹)이나 원 의견을 못 받았을 때(앱)는 끈다
 */
export function usePredictionReplies(predictionId: number, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: predictionKeys.replies(predictionId),
    queryFn: ({ pageParam }) =>
      getPredictionReplies(predictionId, { cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
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

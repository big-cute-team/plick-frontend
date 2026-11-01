"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { ApiError } from "@plick/core/client";
import { predictionKeys } from "@plick/core/predictionKeys";
import { getPredictionOpinions } from "@plick/core/predictions";
import type {
  PredictionOpinionSort,
  PredictionPick,
} from "@plick/domain/prediction";
import { FEED_MAX_RETRIES } from "@/_constants/feed";

/**
 * 경기 하나의 의견 목록 무한 쿼리 (KAN-697, 시안 가이드 §5.4·§8). 예측 탭의 의견 자리가 쓴다.
 *
 * 정렬과 픽 필터가 쿼리 키에 들어가 바꾸면 다른 캐시를 본다. 커서는 정렬마다 다른 값이라
 * 다른 정렬의 커서를 보내면 400이 오는데(티켓 참고), 키가 갈리니 커서가 섞일 일이 없다. 예측
 * 등록·수정·취소 뒤에는 `predictionKeys.opinionsOf`로 정렬·필터를 가리지 않고 통째로 다시
 * 받는다(`usePredictionCompose`, `usePredictionCancel`).
 *
 * 브라우저에서만 받는다. 경기 상세는 익명 ISR이라(KAN-683) 사람마다 다른 잠금 여부와
 * `likedByMe`를 서버에서 받지 않고, 마운트 뒤 `/be` 프록시가 토큰을 실어 받는다. BE가 캐시하지
 * 않는 값이라 `staleTime`은 0이다. 탭에 돌아올 때마다 새로 받는다.
 *
 * `locked: true`는 에러가 아니라 200 응답이다. OPEN에서 예측하지 않은 사용자가 그렇고 화면이
 * 잠금 지면을 그린다. 4xx는 다시 보내도 같은 답이라 순단만 재시도한다(`useComments`와 같다).
 *
 * @param matchId 경기 id
 * @param sort 정렬
 * @param pick 픽 필터. 전체면 null
 * @param enabled UPCOMING처럼 의견 자리가 없는 상태에서는 끈다
 */
export function usePredictionOpinions(
  matchId: number,
  sort: PredictionOpinionSort,
  pick: PredictionPick | null,
  enabled: boolean,
) {
  return useInfiniteQuery({
    queryKey: predictionKeys.opinions(matchId, sort, pick),
    queryFn: ({ pageParam }) =>
      getPredictionOpinions(matchId, { sort, pick, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
    staleTime: 0,
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

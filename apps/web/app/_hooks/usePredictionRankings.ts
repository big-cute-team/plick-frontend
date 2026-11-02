"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { ApiError } from "@plick/core/client";
import { predictionKeys } from "@plick/core/predictionKeys";
import { getPredictionRankings } from "@plick/core/predictions";
import { PREDICTION_RANKING_STALE_MS } from "@plick/domain/prediction";
import { FEED_MAX_RETRIES } from "@/_constants/feed";

/**
 * 시즌 랭킹 무한 쿼리 (KAN-701, 시안 가이드 §5.7·§8). 투표 화면 랭킹 탭이 쓴다.
 *
 * 브라우저에서만 받는다. 투표 화면은 익명 ISR이라(KAN-667) 사람마다 다른 `me`(내 순위)를 서버에서 받을 수
 * 없고, 랭킹 탭은 기본 탭도 아니라 서버 HTML에 실을 이유가 없다. 마운트 뒤 `/be` 프록시가 토큰을 실어
 * 받으니 소셜 계정이면 첫 페이지의 `me`가 채워지고 비로그인은 null이다. 게스트는 BE가 기록이 없는 사용자로
 * 보고 `qualified: false`를 준다.
 *
 * scope를 비워 BE가 이번 시즌을 고르게 하고(티켓 참고 "생략하면 이번 시즌") 응답의 `scope`로 시즌 라벨을
 * 적는다. BE가 10분 캐시하는 값이라 `staleTime`도 10분이다(`PREDICTION_RANKING_STALE_MS`). 정산은 5분
 * 배치라 그 사이 다시 받아도 같은 답이다. 4xx는 다시 보내도 같은 답이라 순단만 재시도한다
 * (`usePredictionOpinions`와 같다).
 *
 * @param enabled 랭킹 탭이 보일 때만 켠다
 */
export function usePredictionRankings(enabled = true) {
  return useInfiniteQuery({
    queryKey: predictionKeys.rankings(),
    queryFn: ({ pageParam }) => getPredictionRankings({ cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
    staleTime: PREDICTION_RANKING_STALE_MS,
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

"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { debateKeys } from "@plick/core/debateKeys";
import { getDebates } from "@plick/core/debates";
import type { DebateListItem, InitialDebateList } from "@plick/domain/types";
import { FEED_FRESH_MS, FEED_MAX_RETRIES } from "@/_constants/feed";

/**
 * 토론 리스트 쿼리 (KAN-418) — 서버 씨앗을 심고 이후 갱신은 클라가 맡는다.
 *
 * suspense 훅이다 (KAN-447) — 씨앗이 있으면 즉시 그리고, 서버 fetch가 실패해
 * 씨앗 없이 들어오면 받는 동안 suspend, 실패하면 throw로 QueryBoundary에
 * 잡힌다. 호출부의 로딩·에러 분기가 사라졌다.
 *
 * 피드류와 달리 페이지네이션이 없는 단일 배열이라 무한쿼리가 아니다. `myVote`가
 * 유저별 값이라 브라우저 refetch는 `/be` 프록시가 Bearer를 실어 준다(릴스
 * `likedByMe`와 같은 규약).
 *
 * @param initial 서버 컴포넌트가 받아 둔 리스트와 그 시각. 서버 fetch가
 *   실패했으면 없이 들어온다.
 */
export function useDebates(initial?: InitialDebateList) {
  return useSuspenseQuery<DebateListItem[]>({
    queryKey: debateKeys.list(),
    queryFn: () => getDebates(),
    staleTime: FEED_FRESH_MS,
    gcTime: FEED_FRESH_MS,
    retry: FEED_MAX_RETRIES,
    ...(initial && {
      initialData: initial.items,
      initialDataUpdatedAt: initial.fetchedAt,
    }),
  });
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { debateKeys } from "@plick/core/debateKeys";
import { getArticleDebate } from "@plick/core/debates";
import type { Debate } from "@plick/domain/types";
import { FEED_MAX_RETRIES } from "@/_constants/feed";

/**
 * 기사 상세의 투표 집계 쿼리 (KAN-681).
 *
 * 기사 상세는 익명 ISR이라(KAN-664) 서버가 준 집계는 최대 60초 전 스냅샷이고, 내가 방금
 * 투표 탭에서 누른 표도 빠져 있다. 서버 props를 씨앗으로 심어 첫 그림은 바로 그리고,
 * 마운트되면 브라우저가 `/be` 프록시로 같은 토론을 다시 받아 최신 집계로 바꾼다.
 * `staleTime`이 0이라 들어올 때마다 다시 받는다. 토론 하나짜리 작은 GET이라 비용이
 * 없다시피 하고, 당겨서 새로고침(`useArticleRefresh`)도 이 쿼리를 refetch한다.
 *
 * 투표 탭·릴스 피드에서 누른 표는 `syncDebateVote`가 이 키에도 옮겨 적는다. 반대로
 * 여기서 누른 표도 같은 함수로 리스트·피드 캐시에 간다.
 *
 * 실패해도 씨앗이 남아 있으니 경계로 던지지 않는다. 집계 하나 때문에 기사 화면이
 * 에러로 바뀌면 안 된다.
 *
 * @param articleId 토론이 붙은 기사 id
 * @param initial 서버 컴포넌트가 받아 둔 토론. 캐시가 비어 있을 때만 씨앗으로 쓰인다
 * @returns 토론. 다시 받았더니 토론이 사라졌으면(404) null
 */
export function useArticleDebate(articleId: string, initial: Debate) {
  return useQuery<Debate | null>({
    queryKey: debateKeys.byArticle(articleId),
    queryFn: () => getArticleDebate(articleId),
    initialData: initial,
    staleTime: 0,
    retry: FEED_MAX_RETRIES,
    throwOnError: false,
  });
}

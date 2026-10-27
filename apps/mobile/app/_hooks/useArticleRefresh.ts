"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { commentKeys } from "@plick/core/commentKeys";
import { debateKeys } from "@plick/core/debateKeys";
import { restartFeedQuery } from "@plick/core/feed-refresh";
import { useServerRefresh } from "@/_hooks/useServerRefresh";

/**
 * 기사 상세를 다시 받는다 (KAN-681). 맨 위에서 당겼을 때 도는 동작.
 *
 * 세 군데를 같이 갱신한다. 투표 집계는 `useArticleDebate` 쿼리를 refetch하고, 댓글은
 * 피드처럼 첫 페이지로 줄여 다시 받고(`restartFeedQuery`), 본문·좋아요 수·관련 기사는
 * 서버 컴포넌트가 그리므로 `router.refresh()`로 RSC 페이로드를 다시 받는다. 페이지가
 * 60초 ISR이라 서버 쪽은 그 주기 안에서는 같은 스냅샷이 올 수 있다. 투표·댓글은
 * 브라우저가 BE에서 직접 받으므로 그 제한이 없다.
 *
 * 토론 없는 기사는 투표 쿼리가 없어 refetch가 바로 끝난다. 댓글 캐시가 아직 없을 때
 * (`ssr: false`로 늦게 받는 중)도 `restartFeedQuery`가 알아서 넘어간다.
 *
 * @param articleId 보고 있는 기사 id
 */
export function useArticleRefresh(articleId: string) {
  const queryClient = useQueryClient();
  const refreshServer = useServerRefresh();

  return useCallback(
    () =>
      Promise.all([
        queryClient.refetchQueries({
          queryKey: debateKeys.byArticle(articleId),
          type: "active",
        }),
        restartFeedQuery(queryClient, commentKeys.list(articleId)),
        refreshServer(),
      ]),
    [queryClient, refreshServer, articleId],
  );
}

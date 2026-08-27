"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@plick/core/client";
import { debateKeys } from "@plick/core/debateKeys";
import { getArticleDebate } from "@plick/core/debates";
import type { Debate } from "@plick/domain/types";
import { FEED_FRESH_MS, FEED_MAX_RETRIES } from "@/_constants/feed";

/**
 * 릴 세부에서 마감된 토론의 결과를 받아온다 (KAN-418).
 *
 * 릴스 피드는 마감(FINISH) 게시물의 `debate`를 null로 내려서 결과를 그릴 수
 * 없다 — 기사 단건 토론(`GET /articles/{id}/debate`)은 마감돼도 200이라, 시트가
 * 열릴 때 클라에서 따로 받는다. 기자 목록(`useArticleReporters`)과 같은 패턴이고
 * 캐시·재시도 정책도 같다 — 4xx는 다시 보내도 같은 답이라 재시도하지 않는다.
 *
 * 마감 결과는 표시 전용이라 익명으로 불러도 충분하지만, 브라우저 fetch는 `/be`
 * 프록시가 토큰을 실어 주므로 내 투표 여부(✓)까지 그대로 온다.
 *
 * @param articleId 기사(릴) id. undefined면 부르지 않는다 — 마감 릴이 아닐 때와
 *   웹 패널의 닫힘 상태용.
 */
export function useArticleDebate(
  articleId: string | undefined,
): Debate | undefined {
  const { data } = useQuery({
    queryKey: debateKeys.article(articleId ?? ""),
    queryFn: () => getArticleDebate(articleId as string),
    enabled: Boolean(articleId),
    staleTime: FEED_FRESH_MS,
    gcTime: FEED_FRESH_MS,
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
  return data ?? undefined;
}

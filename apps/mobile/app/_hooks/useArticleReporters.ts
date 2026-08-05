"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@plick/core/client";
import { articleKeys } from "@plick/core/articleKeys";
import { getArticle } from "@plick/core/articles";
import type { ArticleSourceReporter } from "@plick/domain/types";
import { FEED_FRESH_MS, FEED_MAX_RETRIES } from "@/_constants/feed";

/**
 * 릴 세부에서 기사에 실린 기자 전원을 받아온다 (KAN-365).
 *
 * 기자 배열은 기사 상세(`GET /api/v1/articles/{id}`)에만 있고 릴스 피드는 대표
 * 한 명만 준다. 그래서 시트가 열릴 때 상세를 클라에서 받아 기자 줄을 채운다 —
 * 받기 전이나 실패하면 undefined를 돌려주고, 그동안 기자 줄은 피드가 준 대표
 * 이름으로만 선다(펼침 버튼 없이). 익명으로 불러도 기자 목록은 같다.
 *
 * 캐시·재시도 정책은 댓글(`useComments`)과 같다 — 4xx는 다시 보내도 같은 답이라
 * 재시도하지 않는다.
 *
 * @param articleId 기사(릴) id. undefined면 부르지 않는다(웹 패널의 닫힘 상태용).
 */
export function useArticleReporters(
  articleId: string | undefined,
): ArticleSourceReporter[] | undefined {
  const { data } = useQuery({
    queryKey: articleKeys.detail(articleId ?? ""),
    queryFn: () => getArticle(articleId as string),
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
  return data?.reporters;
}

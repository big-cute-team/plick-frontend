"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { ApiError } from "@plick/core/client";
import { commentKeys } from "@plick/core/commentKeys";
import { getComments } from "@plick/core/comments";
import { FEED_FRESH_MS, FEED_MAX_RETRIES } from "@/_constants/feed";

/**
 * 댓글 목록 (KAN-303). 기사 세부·릴 세부 시트 공용.
 *
 * suspense 훅이다 (KAN-447) — 받는 동안 suspend돼 감싼 QueryBoundary의 fallback이
 * 보인다. 전에는 기사 세부가 서버에서 받은 첫 페이지를 씨앗으로 심었는데, 페이지가 익명
 * ISR이 되면서(KAN-664) 사람마다 다른 댓글 응답을 서버에서 받지 않게 돼 씨앗이 없어졌다.
 * 두 화면 모두 브라우저에서만 이 훅을 부른다. 실패는 throw로
 * 같은 경계에 잡힌다. 호출부는 로딩·에러 분기 없이 데이터만 그린다.
 *
 * 피드(`useReelsFeed`)와 같은 커서 규약이다 — `nextCursor`가 null인지로만 끝을
 * 판단하고, `getNextPageParam`이 undefined를 돌려줘야 RQ가 마지막 페이지로
 * 본다(null을 돌려주면 첫 페이지를 무한히 다시 받는다). 캐시·재시도 정책도
 * 피드 상수를 그대로 쓴다 — staleTime과 gcTime을 붙여 두는 이유는
 * `FEED_FRESH_MS` 주석 참고.
 *
 * @param articleId 기사(릴) id
 */
export function useComments(articleId: string) {
  return useSuspenseInfiniteQuery({
    queryKey: commentKeys.list(articleId),
    queryFn: ({ pageParam }) => getComments(articleId, { cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: FEED_FRESH_MS,
    gcTime: FEED_FRESH_MS,
    // 4xx는 다시 보내도 같은 답이다(없는 기사 404, 상한 커서 400). 순단만 재시도
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

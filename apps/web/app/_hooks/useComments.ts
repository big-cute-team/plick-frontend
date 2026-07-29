"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { ApiError } from "@plick/core/client";
import { commentKeys } from "@plick/core/commentKeys";
import { getComments } from "@plick/core/comments";
import type { InitialCommentPage } from "@plick/domain/types";
import { FEED_FRESH_MS, FEED_MAX_RETRIES } from "@/_constants/feed";

/**
 * 댓글 목록 (KAN-303, web 이식 KAN-329). 기사 세부·릴 세부 패널 공용.
 * 모바일 `useComments`의 복제다 — 훅은 승격하지 않고 앱별로 둔다.
 *
 * 피드(`useReelsFeed`)와 같은 커서 규약이다 — `nextCursor`가 null인지로만 끝을
 * 판단하고, `getNextPageParam`이 undefined를 돌려줘야 RQ가 마지막 페이지로
 * 본다(null을 돌려주면 첫 페이지를 무한히 다시 받는다). 캐시·재시도 정책도
 * 피드 상수를 그대로 쓴다 — staleTime과 gcTime을 붙여 두는 이유는
 * `FEED_FRESH_MS` 주석 참고.
 *
 * @param articleId 기사(릴) id
 * @param initial 서버 컴포넌트가 미리 받아 둔 첫 페이지와 그 시각(기사 세부).
 *   릴 세부 패널은 클라에서 열리므로 씨앗 없이 들어와 마운트 때 받는다.
 */
export function useComments(articleId: string, initial?: InitialCommentPage) {
  return useInfiniteQuery({
    queryKey: commentKeys.list(articleId),
    queryFn: ({ pageParam }) => getComments(articleId, { cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialData: initial
      ? { pages: [initial.page], pageParams: [null] }
      : undefined,
    // 씨앗의 신선도를 서버가 받은 시각으로 못박는다. 기기 시계가 뒤처져 미래로
    // 보이면 영영 신선해지므로 지금으로 깎는다 (useReelsFeed와 같은 이유)
    initialDataUpdatedAt: initial
      ? () => Math.min(initial.fetchedAt, Date.now())
      : undefined,
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

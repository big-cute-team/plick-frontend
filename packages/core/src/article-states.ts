/**
 * @file 내 기사 상태 일괄 조회 (KAN-664, BE KAN-663 `GET /api/v1/users/me/article-states`).
 *
 * 기사 상세·릴스·투표 화면은 익명으로 받아 ISR로 캐시하고, 사람마다 다른 "내가 좋아요를
 * 눌렀나, 어느 쪽에 투표했나"만 페이지가 뜬 뒤 이 API로 받아 얹는다(ADR 0200).
 *
 * 브라우저에서만 부른다. 토큰은 각 앱 `proxy.ts`가 `/be` 요청에 실어 준다. BE 응답이
 * `no-store, private`이고 사람마다 값이 달라 서버 데이터 캐시에 넣으면 안 된다.
 *
 * 화면은 카드마다 기사 하나의 상태를 묻는다(`articleStateKeys.byId`). 카드 30장이 한꺼번에
 * 뜨면 요청이 30번 나가지 않도록 `createArticleStateLoader`가 같은 순간에 들어온 id를
 * 모아 한 번에 보낸다(`article-state-batch.ts`). BE 상한(60개)을 넘으면 나눠서 동시에 보낸다.
 */

import type { QueryClient } from "@tanstack/react-query";
import type { ArticleState, VoteOption } from "@plick/domain/types";
import { chunkArticleIds } from "./article-state-batch";
import { apiFetch } from "./client";
import { articleStateKeys } from "./articleStateKeys";
import { writeArticleStateMemo } from "./article-state-memo";

interface ArticleStateResponse {
  articleSummaryId: number;
  liked: boolean;
  vote: VoteOption | null;
}

/**
 * 여러 기사의 내 상태를 받는다.
 *
 * 걸러진 id와 응답에 빠진 id는 결과 맵에 없다. 호출부가 `DEFAULT_ARTICLE_STATE`로 본다.
 *
 * @param ids 기사 id 목록
 * @returns 기사 id → 내 상태
 * @throws {ApiError} 401(세션 없음) 등 BE 실패
 */
export async function getArticleStates(
  ids: readonly string[],
): Promise<Map<string, ArticleState>> {
  const pages = await Promise.all(
    chunkArticleIds(ids).map((chunk) =>
      apiFetch<ArticleStateResponse[]>(
        `/api/v1/users/me/article-states?ids=${chunk.join(",")}`,
        { cache: "no-store" },
      ),
    ),
  );
  return new Map(
    pages
      .flat()
      .map((s) => [
        String(s.articleSummaryId),
        { liked: s.liked, vote: s.vote },
      ]),
  );
}

/**
 * 누른 직후 내 상태를 캐시와 기억에 적는다.
 *
 * BE 안내대로 누른 뒤에는 다시 묻지 않는다. 좋아요는 등록·취소가 성공하면 그 상태가 맞고,
 * 투표는 응답에 `myVote`가 온다. 캐시에 아직 없는 기사는 만들지 않는다. 한쪽 필드만 알고
 * 나머지(예: 좋아요만 눌렀을 때의 투표)는 모르기 때문이다. 그 기사는 화면에 뜰 때 새로 묻는다.
 *
 * @param queryClient 앱의 QueryClient
 * @param articleId 기사 id
 * @param patch 바뀐 필드
 */
export function setMyArticleState(
  queryClient: QueryClient,
  articleId: string,
  patch: Partial<ArticleState>,
): void {
  queryClient.setQueryData<ArticleState>(
    articleStateKeys.byId(articleId),
    (current) => current && { ...current, ...patch },
  );
  writeArticleStateMemo(articleId, patch);
}

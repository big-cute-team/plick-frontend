/**
 * @file 댓글 조회 fetcher (KAN-303, `GET /api/v1/articles/{articleId}/comments`).
 *
 * 모바일 `_services/comments.ts`로 살다 web이 두 번째 사용처가 되면서 승격했다
 * (KAN-329, ADR 0011 게이트 C). 작성(POST)은 쿠키를 읽어야 해 각 앱의 서버
 * 액션(`_services/comment-actions.ts`)에 남고, 그쪽이 여기 BE 응답 타입과
 * 경계 변환을 가져다 쓴다.
 *
 * 서버 컴포넌트(기사 세부 첫 페이지)와 클라 훅(릴 세부·다음 페이지)이 함께
 * 부르므로 릴스 fetcher처럼 평범한 모듈이다. base URL 선택은 `apiFetch`가
 * 실행 위치를 보고 알아서 한다.
 *
 * 익명 허용 공개 API지만 토큰을 실어야 `likedByMe`가 그 유저 기준으로 온다.
 * 브라우저에서 부를 때는 각 앱 `proxy.ts`가 `/be` 요청에 Bearer를 심어 주므로
 * 여기서 넘길 게 없고, 서버 컴포넌트가 부를 때만 호출부가 `getAccessToken()`으로
 * 꺼내 넘긴다(기사 상세와 같은 방식, ADR 0044).
 */

import type { ArticleComment, CommentPage } from "@plick/domain/types";
import { apiFetch } from "./client";

/** BE 응답 댓글 한 건 (be-verify가 실제 응답으로 확인한 그대로). 대댓글도 같은 모양. */
export interface CommentResponse {
  commentId: number;
  nickname: string;
  /** 삭제된 댓글이면 null */
  content: string | null;
  createdAt: string;
  isEdited: boolean;
  isDeleted: boolean;
  likeCount: number;
  likedByMe: boolean;
  replies: CommentResponse[];
}

interface CommentListResponse {
  items: CommentResponse[];
  nextCursor: string | null;
}

/**
 * 댓글 본문 최대 글자수. BE 검증(1~500자)과 같은 값이다 — 클라에서 미리 걸어
 * 400 `COMMON_INVALID_PARAM` 왕복을 줄이고, BE가 최종 검증한다.
 */
export const COMMENT_MAX_LENGTH = 500;

/**
 * 댓글 한 페이지 건수 (BE 기본값과 같다, 상한 30). 첫 화면에 이만큼 보여주고
 * 나머지는 "댓글 더 보기"로 이어 받는다.
 */
export const COMMENTS_PAGE_SIZE = 10;

/** BE → 도메인 경계 변환. 대댓글까지 재귀로 같은 모양으로 내린다. */
export function toComment(r: CommentResponse): ArticleComment {
  return {
    id: r.commentId,
    nickname: r.nickname,
    content: r.content,
    createdAt: r.createdAt,
    isEdited: r.isEdited,
    isDeleted: r.isDeleted,
    likeCount: r.likeCount,
    liked: r.likedByMe,
    replies: r.replies.map(toComment),
  };
}

/**
 * 댓글 한 페이지를 가져온다. 최상위는 최신순, 각 댓글의 `replies`는 오래된순으로
 * 온다. 릴스와 기사가 같은 id 체계(`articleSummaryId`)를 써서 양쪽 화면이 같은
 * 함수를 부른다.
 *
 * @param articleId 기사(릴) id — 라우트 파라미터와 결이 같은 문자열
 * @param cursor 이전 페이지가 준 `nextCursor`. 첫 페이지면 null.
 * @param size 한 페이지 건수 (1..30)
 * @param accessToken 서버에서 부를 때만 넘긴다 — 응답의 `likedByMe`가 그 유저
 *   기준으로 계산된다. 브라우저 호출은 `proxy.ts`가 대신 실어 준다.
 * @throws {ApiError} 없는 기사는 404 `ARTICLE_NOT_FOUND`,
 *   잘못된 파라미터·커서는 400 `COMMON_INVALID_PARAM`으로 온다
 */
export async function getComments(
  articleId: string,
  {
    cursor = null,
    size = COMMENTS_PAGE_SIZE,
    accessToken,
  }: { cursor?: string | null; size?: number; accessToken?: string } = {},
): Promise<CommentPage> {
  const params = new URLSearchParams({ size: String(size) });
  if (cursor) params.set("cursor", cursor);

  const page = await apiFetch<CommentListResponse>(
    `/api/v1/articles/${encodeURIComponent(articleId)}/comments?${params}`,
    accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  );

  return {
    items: page.items.map(toComment),
    nextCursor: page.nextCursor,
  };
}

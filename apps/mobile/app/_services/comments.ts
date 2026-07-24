/**
 * @file 댓글 조회 fetcher (KAN-303, `GET /api/v1/articles/{articleId}/comments`).
 *
 * 서버 컴포넌트(기사 세부 첫 페이지)와 클라 훅(릴 시트·다음 페이지)이 함께
 * 부르므로 릴스 fetcher처럼 평범한 모듈이다. base URL 선택은 `apiFetch`가
 * 실행 위치를 보고 알아서 한다.
 *
 * 익명 허용 공개 API다. 토큰을 실으면 `likedByMe`만 채워지는데, 댓글 좋아요는
 * 이 티켓 범위 밖이라 일부러 싣지 않는다 — 피드와 같은 판단(만료 토큰이 조회를
 * 통째로 죽이는 걸 피한다, ADR 0030). 좋아요를 붙일 때 재검토한다.
 *
 * 작성(POST)은 보호 API라 쿠키를 읽어야 해서 서버 액션으로 분리했다
 * (`comment-actions.ts`). BE 응답 타입과 경계 변환은 두 파일이 같이 쓰므로
 * 여기서 export한다.
 */

import { apiFetch } from "@/_apis/client";
import { COMMENTS_PAGE_SIZE } from "@/_constants/comments";
import type { ArticleComment, CommentPage } from "@/_types/comments";

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
 * @throws {ApiError} 없는 기사는 404 `ARTICLE_NOT_FOUND`,
 *   잘못된 파라미터·커서는 400 `COMMON_INVALID_PARAM`으로 온다
 */
export async function getComments(
  articleId: string,
  {
    cursor = null,
    size = COMMENTS_PAGE_SIZE,
  }: { cursor?: string | null; size?: number } = {},
): Promise<CommentPage> {
  const params = new URLSearchParams({ size: String(size) });
  if (cursor) params.set("cursor", cursor);

  const page = await apiFetch<CommentListResponse>(
    `/api/v1/articles/${encodeURIComponent(articleId)}/comments?${params}`,
  );

  return {
    items: page.items.map(toComment),
    nextCursor: page.nextCursor,
  };
}

"use client";

import type { InfiniteData } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { commentKeys } from "@plick/core/commentKeys";
import type { ArticleComment, CommentPage } from "@plick/domain/types";
import { useLikeToggle } from "@/_hooks/useLikeToggle";
import { likeComment, unlikeComment } from "@/_services/comment-likes";
import type { LikeState } from "@/_types/likes";

/**
 * 댓글 좋아요 토글 (KAN-309) — {@link useLikeToggle}에 댓글판 원본 갱신을 물린다.
 *
 * 댓글의 원본은 목록 무한 쿼리 캐시 하나뿐이다. 기사 세부는 서버가 첫 페이지를
 * 씨앗으로 심고 릴 시트는 클라에서 처음 받지만, 둘 다 같은 쿼리키를 보므로
 * 캐시만 고치면 두 화면 모두 맞는다. 컴포넌트 state로 들면 시트를 닫았다 열거나
 * 답글을 접었다 펼 때 캐시의 옛 값으로 되돌아간다.
 *
 * 대댓글도 같은 엔드포인트를 쓰지만 캐시에서의 자리가 다르다 — 최상위 배열이
 * 아니라 부모의 `replies` 안에 있다. 그래서 항목마다 자기 자신과 답글을 함께
 * 훑는다. 답글의 답글은 계약상 없으므로(대댓글의 `replies`는 항상 빈 배열)
 * 재귀로 내려가지 않고 2단까지만 본다.
 *
 * @param articleId 이 댓글이 달린 기사(릴) id — 목록 쿼리키를 만드는 데 쓴다
 * @param comment 대상 댓글. 좋아요 상태를 여기서 읽는다(원본이 캐시라 항상 최신)
 */
export function useCommentLike(articleId: string, comment: ArticleComment) {
  const queryClient = useQueryClient();

  return useLikeToggle({
    toggle: (liked) =>
      liked ? likeComment(comment.id) : unlikeComment(comment.id),
    state: { liked: comment.liked, likeCount: comment.likeCount },
    onChange: (next) => {
      queryClient.setQueryData<InfiniteData<CommentPage, string | null>>(
        commentKeys.list(articleId),
        (data) =>
          data && {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              items: page.items.map((item) =>
                applyLike(item, comment.id, next),
              ),
            })),
          },
      );
    },
  });
}

/** 대상이면 좋아요 상태를 덮고, 아니면 답글들에서 찾아 덮는다. */
function applyLike(
  item: ArticleComment,
  commentId: number,
  next: LikeState,
): ArticleComment {
  if (item.id === commentId) return { ...item, ...next };

  const replies = item.replies.map((reply) =>
    reply.id === commentId ? { ...reply, ...next } : reply,
  );
  return replies.some((reply, i) => reply !== item.replies[i])
    ? { ...item, replies }
    : item;
}

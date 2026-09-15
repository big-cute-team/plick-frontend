"use client";

import type { InfiniteData } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { activityKeys } from "@plick/core/activityKeys";
import { ApiError } from "@plick/core/client";
import { commentKeys } from "@plick/core/commentKeys";
import type { ArticleComment, CommentPage } from "@plick/domain/types";
import { deleteComment } from "@/_services/comment-actions";
import type { MyCommentPage } from "@/_types/activity";

/**
 * 댓글 삭제 뮤테이션 (KAN-333). 기사 세부·릴 세부 시트 공용.
 *
 * 성공 응답이 `data: null`이라 캐시는 여기서 직접 고친다 — 항목을 목록에서
 * 빼지 않고 tombstone(`content: null, isDeleted: true`)으로 바꾼다. BE 조회가
 * 대댓글 유무와 무관하게 삭제된 댓글을 tombstone으로 계속 내려주므로(be-verify
 * 확인) 빼 버리면 다음 refetch 때 되살아나 깜빡인다. 화면 렌더는 기존 tombstone
 * 분기(`CommentThread`)가 그대로 받는다.
 *
 * 대상이 대댓글이면 캐시에서의 자리가 부모의 `replies` 안이라 2단까지 훑는다
 * (`useCommentLike`와 같은 모양).
 *
 * 서버 액션은 실패를 값으로 돌려주므로 여기서 `ApiError`로 되살려 던진다 —
 * 호출부는 `code`로 분기한다(`AUTH_REQUIRED`면 로그인 유도 팝업).
 *
 * 마이페이지 "내가 쓴 댓글" 목록(KAN-495)에서는 tombstone이 아니라 줄을 뺀다.
 * 그 API는 삭제한 댓글을 아예 내려주지 않아서 tombstone으로 두면 다음 refetch
 * 때 사라지며 깜빡인다. 활동 개수는 stale로만 표시해 다음 마운트 때 다시 센다.
 *
 * @param articleId 이 댓글이 달린 기사(릴) id — 목록 쿼리키를 만드는 데 쓴다
 */
export function useDeleteComment(articleId: string) {
  const qc = useQueryClient();

  return useMutation({
    /* 콜사이트가 에러 UI를 완결 처리한다 — 전역 안전망 토스트 제외 (KAN-447) */
    meta: { errorHandled: true },
    mutationFn: async (commentId: number) => {
      const result = await deleteComment(commentId);
      if (!result.ok) {
        throw new ApiError(result.status, result.code, result.message);
      }
      return commentId;
    },
    onSuccess: (commentId: number) => {
      qc.setQueryData<InfiniteData<CommentPage, string | null>>(
        commentKeys.list(articleId),
        (data) =>
          data && {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              items: page.items.map((item) => applyDelete(item, commentId)),
            })),
          },
      );
      qc.setQueryData<InfiniteData<MyCommentPage, string | null>>(
        activityKeys.comments(),
        (data) =>
          data && {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              items: page.items.filter((item) => item.id !== commentId),
            })),
          },
      );
      void qc.invalidateQueries({ queryKey: activityKeys.counts() });
    },
  });
}

/** 대상이면 tombstone으로 바꾸고, 아니면 답글들에서 찾아 바꾼다. */
function applyDelete(item: ArticleComment, commentId: number): ArticleComment {
  if (item.id === commentId) {
    return { ...item, content: null, isDeleted: true };
  }

  const replies = item.replies.map((reply) =>
    reply.id === commentId
      ? { ...reply, content: null, isDeleted: true }
      : reply,
  );
  return replies.some((reply, i) => reply !== item.replies[i])
    ? { ...item, replies }
    : item;
}

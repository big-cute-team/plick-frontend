"use client";

import type { InfiniteData } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@plick/core/client";
import { commentKeys } from "@plick/core/commentKeys";
import type { ArticleComment, CommentPage } from "@plick/domain/types";
import { updateComment } from "@/_services/comment-actions";

/**
 * 댓글 수정 뮤테이션 (KAN-333). 기사 세부·릴 세부 패널 공용.
 * 모바일 `useUpdateComment`의 복제다 — 훅은 승격하지 않고 앱별로 둔다.
 *
 * 낙관적 갱신은 안 한다 — BE가 200으로 수정 반영본을 그대로 돌려주므로 성공
 * 응답으로 목록 캐시의 해당 항목을 덮으면 된다(`useCreateComment`와 같은 이유).
 * 응답에서 본문 관련 필드(`content`·`isEdited`)만 골라 덮는다 — 항목을 통째로
 * 갈아끼우면 응답의 `replies` 표현이 목록과 다를 때 접힘 상태의 답글들이
 * 조용히 어긋날 수 있다.
 *
 * 대상이 대댓글이면 캐시에서의 자리가 부모의 `replies` 안이라 2단까지 훑는다
 * (`useCommentLike`와 같은 모양).
 *
 * 서버 액션은 실패를 값으로 돌려주므로 여기서 `ApiError`로 되살려 던진다 —
 * 호출부는 `code`로 분기한다(`AUTH_REQUIRED`면 로그인 유도 팝업).
 *
 * @param articleId 이 댓글이 달린 기사(릴) id — 목록 쿼리키를 만드는 데 쓴다
 */
export function useUpdateComment(articleId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { commentId: number; content: string }) => {
      const result = await updateComment(input.commentId, input.content);
      if (!result.ok) {
        throw new ApiError(result.status, result.code, result.message);
      }
      return result.comment;
    },
    onSuccess: (updated: ArticleComment) => {
      qc.setQueryData<InfiniteData<CommentPage, string | null>>(
        commentKeys.list(articleId),
        (data) =>
          data && {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              items: page.items.map((item) => applyEdit(item, updated)),
            })),
          },
      );
    },
  });
}

/** 대상이면 수정 반영본의 본문 필드를 덮고, 아니면 답글들에서 찾아 덮는다. */
function applyEdit(
  item: ArticleComment,
  updated: ArticleComment,
): ArticleComment {
  if (item.id === updated.id) {
    return { ...item, content: updated.content, isEdited: updated.isEdited };
  }

  const replies = item.replies.map((reply) =>
    reply.id === updated.id
      ? { ...reply, content: updated.content, isEdited: updated.isEdited }
      : reply,
  );
  return replies.some((reply, i) => reply !== item.replies[i])
    ? { ...item, replies }
    : item;
}

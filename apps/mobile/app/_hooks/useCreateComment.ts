"use client";

import type { InfiniteData } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/_apis/client";
import { commentKeys } from "@/_queries/commentKeys";
import { createComment } from "@/_services/comment-actions";
import type { ArticleComment, CommentPage } from "@/_types/comments";

/**
 * 댓글·답글 작성 뮤테이션 (KAN-303). 기사 세부·릴 세부 시트 공용.
 *
 * 낙관적 갱신은 안 한다 — BE가 201로 생성된 댓글 객체를 그대로 돌려주므로
 * 성공 응답을 목록 캐시에 끼워 넣기만 하면 된다. 원 댓글은 맨 앞에(최상위가
 * 최신순), 답글은 부모의 `replies` 끝에(답글은 오래된순) 넣는다. 전체 무효화는
 * 일부러 피한다 — 무한 쿼리 재요청은 쌓인 페이지를 전부 순차로 다시 받는다
 * (`FEED_FRESH_MS` 주석 참고).
 *
 * 서버 액션은 실패를 값으로 돌려주므로(경계를 넘으면 에러 메시지가 가려진다)
 * 여기서 `ApiError`로 되살려 던진다 — 호출부는 `code`로 분기한다
 * (`AUTH_REQUIRED`면 로그인 유도 팝업).
 *
 * @param articleId 기사(릴) id
 * @param onPosted 성공 시 호출 — 호출부가 헤더 카운트를 올리는 데 쓴다
 *   (BE `commentCount`는 답글도 센다). 카운트 원본(기사 상세·릴 카드의
 *   `commentCount`)은 서버가 준 스냅샷이라 여기서 캐시로 고칠 수 없다.
 */
export function useCreateComment(articleId: string, onPosted?: () => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      content: string;
      parentCommentId?: number;
    }) => {
      const result = await createComment(
        articleId,
        input.content,
        input.parentCommentId,
      );
      if (!result.ok) {
        throw new ApiError(result.status, result.code, result.message);
      }
      return result.comment;
    },
    onSuccess: (comment: ArticleComment, input) => {
      qc.setQueryData<InfiniteData<CommentPage, string | null>>(
        commentKeys.list(articleId),
        (data) => {
          // 목록을 아직 안 받았으면 끼울 곳이 없다 — 첫 조회가 새 댓글째 받아온다
          const first = data?.pages[0];
          if (!data || !first) return data;

          if (input.parentCommentId == null) {
            return {
              ...data,
              pages: [
                { ...first, items: [comment, ...first.items] },
                ...data.pages.slice(1),
              ],
            };
          }

          return {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              items: page.items.map((item) =>
                item.id === input.parentCommentId
                  ? { ...item, replies: [...item.replies, comment] }
                  : item,
              ),
            })),
          };
        },
      );
      onPosted?.();
    },
  });
}

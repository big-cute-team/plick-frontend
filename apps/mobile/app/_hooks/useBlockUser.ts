"use client";

import type { InfiniteData } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@plick/core/client";
import { commentKeys } from "@plick/core/commentKeys";
import {
  removeBlockedOpinions,
  removeBlockedReplies,
} from "@plick/core/prediction-sync";
import { predictionKeys } from "@plick/core/predictionKeys";
import type {
  PredictionOpinionPage,
  PredictionReplyPage,
} from "@plick/domain/prediction";
import type { ArticleComment, CommentPage } from "@plick/domain/types";
import { blockUser } from "@/_services/block-actions";

/**
 * 사용자 차단 뮤테이션 (KAN-411). 기사 세부·릴 세부 시트 공용.
 *
 * 마스킹은 서버 몫이다 — 다음 조회부터 그 유저의 댓글이 `isBlocked: true` +
 * 마스킹된 content로 온다. 이미 받아 둔 캐시에는 원문이 그대로 남아 있으므로,
 * 성공 시 캐시된 모든 댓글 목록(기사마다 엔트리가 따로다)에서 그 유저의 댓글에
 * `isBlocked`를 세워 지금 보고 있는 화면부터 가린다. content는 안 건드린다 —
 * 렌더가 플래그를 content보다 먼저 보고 안내 문구를 그리므로(`CommentThread`)
 * 그걸로 충분하고, 해제 때 원문을 되살릴 수도 있다.
 *
 * `invalidateQueries`를 안 쓰는 이유는 다른 댓글 뮤테이션과 같다 — 무한 쿼리
 * 무효화는 쌓인 페이지를 전부 순차로 다시 받는다.
 *
 * 예측 의견과 답글(KAN-697)은 댓글과 달리 캐시에서 뺀다. BE 계약이 차단한 사용자의 의견을
 * 목록에서 빼고 주는 쪽이라(시안 가이드 §5.4) 플래그로 가릴 자리가 없고, 다음 조회와 같은
 * 모양이 되게 지금 받아 둔 페이지에서도 그 사용자의 행을 지운다(core `removeBlockedOpinions`).
 *
 * 서버 액션은 실패를 값으로 돌려주므로 여기서 `ApiError`로 되살려 던진다.
 */
export function useBlockUser() {
  const qc = useQueryClient();

  return useMutation({
    /* 콜사이트가 에러 UI를 완결 처리한다 — 전역 안전망 토스트 제외 (KAN-447) */
    meta: { errorHandled: true },
    mutationFn: async (blockedUserId: number) => {
      const result = await blockUser(blockedUserId);
      if (!result.ok) {
        throw new ApiError(result.status, result.code, result.message);
      }
      return blockedUserId;
    },
    onSuccess: (blockedUserId: number) => {
      qc.setQueriesData<InfiniteData<CommentPage, string | null>>(
        /* 댓글 수 캐시(숫자)는 같은 상위 키 아래라 목록 키로만 훑는다 (KAN-748) */
        { queryKey: commentKeys.lists() },
        (data) =>
          data && {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              items: page.items.map((item) => applyBlock(item, blockedUserId)),
            })),
          },
      );
      qc.setQueriesData<InfiniteData<PredictionOpinionPage, string | null>>(
        { queryKey: predictionKeys.opinionLists() },
        (data) => removeBlockedOpinions(data, blockedUserId),
      );
      qc.setQueriesData<InfiniteData<PredictionReplyPage, string | null>>(
        { queryKey: predictionKeys.replyLists() },
        (data) => removeBlockedReplies(data, blockedUserId),
      );
    },
  });
}

/** 그 유저의 것이면 차단 플래그를 세운다 — 답글까지 2단 순회(`useDeleteComment`와 같은 모양). */
function applyBlock(item: ArticleComment, userId: number): ArticleComment {
  const self = item.userId === userId ? { ...item, isBlocked: true } : item;

  const replies = self.replies.map((reply) =>
    reply.userId === userId ? { ...reply, isBlocked: true } : reply,
  );
  return replies.some((reply, i) => reply !== self.replies[i])
    ? { ...self, replies }
    : self;
}

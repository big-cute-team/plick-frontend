"use client";

import { useMutation } from "@tanstack/react-query";
import { ApiError } from "@plick/core/client";
import type { CommentReportReason } from "@plick/domain/types";
import { reportComment } from "@/_services/comment-reports";

/**
 * 댓글 신고 뮤테이션 (KAN-411). 기사 세부·릴 세부 시트 공용.
 *
 * 신고는 접수만 하고 처리(블라인드 판정)는 운영자 몫이라 성공해도 댓글 표시가
 * 안 바뀐다 — 캐시를 건드릴 게 없어 다른 댓글 뮤테이션과 달리 QueryClient를
 * 안 잡는다. 화면은 접수 안내로 상태만 바꾼다(`ReportCommentDialog`).
 *
 * 서버 액션은 실패를 값으로 돌려주므로 여기서 `ApiError`로 되살려 던진다 —
 * 호출부는 `code`로 분기한다(`AUTH_REQUIRED`면 로그인 유도,
 * `COMMENT_ALREADY_REPORTED` 등은 BE 메시지를 그대로 보여준다).
 */
export function useReportComment() {
  return useMutation({
    mutationFn: async ({
      commentId,
      reason,
    }: {
      commentId: number;
      reason: CommentReportReason;
    }) => {
      const result = await reportComment(commentId, reason);
      if (!result.ok) {
        throw new ApiError(result.status, result.code, result.message);
      }
    },
  });
}

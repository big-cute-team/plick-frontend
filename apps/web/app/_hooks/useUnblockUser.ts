"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@plick/core/client";
import { commentKeys } from "@plick/core/commentKeys";
import { unblockUser } from "@/_services/block-actions";

/**
 * 사용자 차단 해제 뮤테이션 (KAN-411) — 차단 목록 화면의 해제 버튼이 쓴다.
 *
 * 해제하면 그 유저의 댓글이 다시 보여야 하는데, 차단 중 받아 둔 캐시에는 서버가
 * 마스킹한 content만 있어 `setQueryData`로는 원문을 되살릴 수 없다. 그래서
 * 댓글 캐시를 통째로 버린다(`removeQueries`) — 다음에 댓글 화면에 들어가면
 * 첫 페이지부터 새로 받아 원문이 온다. 차단 목록 화면과 댓글 화면은 동시에
 * 안 보이므로 화면이 비거나 깜빡일 일은 없다.
 *
 * BE 해제는 완전 멱등(미차단·없는 유저도 200, be-verify 확인)이라 실패는
 * 사실상 인증·네트워크뿐이다. 서버 액션은 실패를 값으로 돌려주므로 여기서
 * `ApiError`로 되살려 던진다.
 */
export function useUnblockUser() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (blockedUserId: number) => {
      const result = await unblockUser(blockedUserId);
      if (!result.ok) {
        throw new ApiError(result.status, result.code, result.message);
      }
      return blockedUserId;
    },
    onSuccess: () => {
      qc.removeQueries({ queryKey: commentKeys.all });
    },
  });
}

"use server";

import { cookies } from "next/headers";
import { ApiError, apiFetch } from "@plick/core/client";
import type {
  CommentReportReason,
  ReportCommentResult,
} from "@plick/domain/types";
import { AUTH_COOKIES } from "@/_constants/api";

/**
 * 댓글 신고 서버 액션 (KAN-411, `POST /api/v1/comments/{commentId}/report`).
 *
 * 보호 API라 HttpOnly 쿠키의 access 토큰을 Bearer로 실어야 하는데 클라는 그
 * 쿠키를 못 읽으므로 서버 액션을 경유한다. 실패를 값으로 돌려주는 이유는
 * `comment-actions.ts`와 같다 — 서버 액션이 던진 에러는 프로덕션에서 메시지가
 * 가려져 클라가 BE 에러 code로 분기할 수 없다.
 *
 * 신고 후 처리(운영자 확인 → 블라인드)는 전부 BE·어드민 몫이라 성공해도 댓글
 * 표시는 그대로다 — 화면은 접수 안내만 보여주고 끝난다.
 *
 * @param commentId 댓글(대댓글) id — BE `commentId` 숫자 그대로
 * @param reason 신고 사유 — BE enum 문자열 (`COMMENT_REPORT_REASONS` 참조)
 * @returns 성공 여부. 실패면 BE 에러 code·message — 이미 신고한 댓글은 409
 *   `COMMENT_ALREADY_REPORTED`, 내 댓글은 400 `COMMENT_SELF_REPORT`, 삭제된
 *   (또는 없는) 댓글은 404 `COMMENT_NOT_FOUND`로 온다. 비로그인(쿠키 없음)은
 *   BE까지 안 가고 401 `AUTH_REQUIRED`로 돌려준다.
 */
export async function reportComment(
  commentId: number,
  reason: CommentReportReason,
): Promise<ReportCommentResult> {
  const jar = await cookies();
  const accessToken = jar.get(AUTH_COOKIES.access)?.value;
  if (!accessToken) {
    return {
      ok: false,
      status: 401,
      code: "AUTH_REQUIRED",
      message: "로그인이 필요합니다.",
    };
  }

  try {
    await apiFetch<null>(`/api/v1/comments/${commentId}/report`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ reason }),
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof ApiError) {
      return { ok: false, status: e.status, code: e.code, message: e.message };
    }
    console.error("[comment-reports] 댓글 신고 실패:", e);
    return {
      ok: false,
      status: 0,
      code: "NETWORK",
      message: "신고를 접수하지 못했어요. 잠시 후 다시 시도해 주세요.",
    };
  }
}

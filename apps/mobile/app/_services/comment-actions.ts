"use server";

import { cookies } from "next/headers";
import { ApiError, apiFetch } from "@plick/core/client";
import { AUTH_COOKIES } from "@/_constants/api";
import type { CreateCommentResult } from "@/_types/comments";
import type { CommentResponse } from "./comments";
import { toComment } from "./comments";

/**
 * 댓글 작성 서버 액션 (KAN-303, `POST /api/v1/articles/{articleId}/comments`).
 *
 * 보호 API라 HttpOnly 쿠키의 access 토큰을 Bearer로 실어야 하는데 클라는 그
 * 쿠키를 못 읽으므로 서버 액션을 경유한다. 조회 fetcher(`comments.ts`)와 파일이
 * 갈린 건 `"use server"` 파일이 async 함수만 export할 수 있어서다.
 *
 * 결과는 던지지 않고 값으로 돌려준다 — 서버 액션이 던진 에러는 프로덕션에서
 * 메시지가 가려져 클라가 BE 에러 code로 분기할 수 없다. 클라 훅
 * (`useCreateComment`)이 실패 값을 `ApiError`로 되살려 던진다.
 *
 * @param articleId 기사(릴) id — 릴스와 같은 `articleSummaryId` 체계
 * @param content 본문 (1~500자, 공백만은 BE가 400으로 거절)
 * @param parentCommentId 답글이면 원 댓글 id. 항상 최상위 댓글 id를 싣는다 —
 *   없는 id면 404 `COMMENT_NOT_FOUND`로 온다.
 * @returns 성공이면 201로 생성된 댓글 한 건. 실패면 BE 에러 code·message.
 *   비로그인(쿠키 없음)은 BE까지 안 가고 401 `AUTH_REQUIRED`로 돌려준다.
 */
export async function createComment(
  articleId: string,
  content: string,
  parentCommentId?: number,
): Promise<CreateCommentResult> {
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
    const created = await apiFetch<CommentResponse>(
      `/api/v1/articles/${encodeURIComponent(articleId)}/comments`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(
          parentCommentId == null ? { content } : { content, parentCommentId },
        ),
      },
    );
    return { ok: true, comment: toComment(created) };
  } catch (e) {
    if (e instanceof ApiError) {
      return { ok: false, status: e.status, code: e.code, message: e.message };
    }
    console.error("[comments] 댓글 작성 실패:", e);
    return {
      ok: false,
      status: 0,
      code: "NETWORK",
      message: "댓글을 등록하지 못했어요. 잠시 후 다시 시도해 주세요.",
    };
  }
}

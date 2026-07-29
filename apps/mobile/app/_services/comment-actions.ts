"use server";

import { cookies } from "next/headers";
import { ApiError, apiFetch } from "@plick/core/client";
import type { CommentResponse } from "@plick/core/comments";
import { toComment } from "@plick/core/comments";
import type {
  CreateCommentResult,
  DeleteCommentResult,
  UpdateCommentResult,
} from "@plick/domain/types";
import { AUTH_COOKIES } from "@/_constants/api";

/**
 * 댓글 작성 서버 액션 (KAN-303, `POST /api/v1/articles/{articleId}/comments`).
 *
 * 보호 API라 HttpOnly 쿠키의 access 토큰을 Bearer로 실어야 하는데 클라는 그
 * 쿠키를 못 읽으므로 서버 액션을 경유한다. 조회 fetcher(`@plick/core/comments`)와
 * 파일이 갈린 건 `"use server"` 파일이 async 함수만 export할 수 있어서다.
 * 쿠키 이름이 앱에 박혀 있어 이 파일은 승격하지 않고 앱별로 복제한다(KAN-329).
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

/**
 * 댓글 수정 서버 액션 (KAN-333, `PATCH /api/v1/comments/{commentId}`).
 *
 * 인증 경유·실패를 값으로 돌려주는 이유는 {@link createComment}와 같다.
 * BE가 200으로 수정 반영본 한 건(`isEdited: true`)을 그대로 돌려주므로 클라 훅
 * (`useUpdateComment`)이 그걸로 목록 캐시의 해당 항목을 고친다.
 *
 * @param commentId 댓글(대댓글) id — BE `commentId` 숫자 그대로
 * @param content 바꿀 본문 (1~500자, 공백만은 BE가 400으로 거절)
 * @returns 성공이면 수정된 댓글 한 건. 실패면 BE 에러 code·message —
 *   남의 댓글은 403 `COMMENT_FORBIDDEN`, 없는(또는 이미 삭제된) 댓글은
 *   404 `COMMENT_NOT_FOUND`로 온다.
 */
export async function updateComment(
  commentId: number,
  content: string,
): Promise<UpdateCommentResult> {
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
    const updated = await apiFetch<CommentResponse>(
      `/api/v1/comments/${commentId}`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ content }),
      },
    );
    return { ok: true, comment: toComment(updated) };
  } catch (e) {
    if (e instanceof ApiError) {
      return { ok: false, status: e.status, code: e.code, message: e.message };
    }
    console.error("[comments] 댓글 수정 실패:", e);
    return {
      ok: false,
      status: 0,
      code: "NETWORK",
      message: "댓글을 수정하지 못했어요. 잠시 후 다시 시도해 주세요.",
    };
  }
}

/**
 * 댓글 삭제 서버 액션 (KAN-333, `DELETE /api/v1/comments/{commentId}`).
 *
 * 소프트 삭제다 — BE는 행을 지우지 않고 `isDeleted`만 세우고, 목록 조회에는
 * 대댓글 유무와 무관하게 tombstone(`content: null`)으로 계속 나온다. 성공 응답이
 * `data: null`이라 실을 값이 없어 캐시 tombstone 처리는 클라 훅
 * (`useDeleteComment`)이 한다. 이미 삭제된 자기 댓글에 다시 보내도 200(멱등).
 *
 * @param commentId 댓글(대댓글) id
 * @returns 성공 여부. 실패 규약은 {@link updateComment}와 같다.
 */
export async function deleteComment(
  commentId: number,
): Promise<DeleteCommentResult> {
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
    await apiFetch<null>(`/api/v1/comments/${commentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof ApiError) {
      return { ok: false, status: e.status, code: e.code, message: e.message };
    }
    console.error("[comments] 댓글 삭제 실패:", e);
    return {
      ok: false,
      status: 0,
      code: "NETWORK",
      message: "댓글을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.",
    };
  }
}

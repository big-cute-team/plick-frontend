"use server";

/**
 * @file 댓글 좋아요 등록·취소 서버 액션
 * (KAN-309, `POST`·`DELETE /api/v1/comments/{commentId}/like`).
 *
 * 보호 API라 HttpOnly 쿠키의 access 토큰을 Bearer로 실어야 하는데 클라는 그
 * 쿠키를 못 읽으므로 서버 액션을 경유한다. 기사 좋아요(`article-likes.ts`)와
 * 같은 이유·같은 모양이고, 응답 shape(`{ likeCount }`)도 같다.
 *
 * 원 댓글과 대댓글이 같은 엔드포인트를 쓴다 — 조회 응답에서 대댓글이 부모의
 * `replies`에 인라인으로 딸려 올 뿐 좋아요 계약은 완전히 같다(be-verify 확인).
 *
 * 두 메서드 모두 멱등이다. 이미 누른 댓글에 POST를 또 보내도, 안 누른 댓글에
 * DELETE를 보내도 409가 아니라 200에 현재 카운트가 온다.
 *
 * 소프트 삭제된 댓글도 BE는 200으로 받아 준다. 삭제된 댓글에 좋아요를 못 누르게
 * 막는 건 화면 몫이라 `CommentThread`가 tombstone이면 액션 줄을 아예 안 그린다.
 */

import { cookies } from "next/headers";
import { ApiError, apiFetch } from "@/_apis/client";
import { AUTH_COOKIES } from "@/_constants/api";
import type { ToggleLikeResult } from "@/_types/likes";

/** 두 액션이 공유하는 호출부 — 메서드만 다르고 인증·에러 처리가 같다. */
async function toggleLike(
  commentId: number,
  method: "POST" | "DELETE",
): Promise<ToggleLikeResult> {
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
    const { likeCount } = await apiFetch<{ likeCount: number }>(
      `/api/v1/comments/${commentId}/like`,
      { method, headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return { ok: true, likeCount };
  } catch (e) {
    if (e instanceof ApiError) {
      return { ok: false, status: e.status, code: e.code, message: e.message };
    }
    console.error("[comment-likes] 좋아요 토글 실패:", e);
    return {
      ok: false,
      status: 0,
      code: "NETWORK",
      message: "좋아요를 반영하지 못했어요. 잠시 후 다시 시도해 주세요.",
    };
  }
}

/**
 * 댓글 좋아요를 등록한다.
 *
 * @param commentId 댓글(대댓글) id — BE `commentId` 숫자 그대로
 * @returns 성공이면 BE가 계산한 최신 좋아요 수. 실패면 BE 에러 code·message.
 *   비로그인(쿠키 없음)은 BE까지 안 가고 401 `AUTH_REQUIRED`로 돌려주고,
 *   남이 하드 삭제한 댓글은 404 `COMMENT_NOT_FOUND`로 온다.
 */
export async function likeComment(
  commentId: number,
): Promise<ToggleLikeResult> {
  return toggleLike(commentId, "POST");
}

/**
 * 댓글 좋아요를 취소한다. 에러 규약은 {@link likeComment}와 같다.
 *
 * @param commentId 댓글(대댓글) id
 */
export async function unlikeComment(
  commentId: number,
): Promise<ToggleLikeResult> {
  return toggleLike(commentId, "DELETE");
}

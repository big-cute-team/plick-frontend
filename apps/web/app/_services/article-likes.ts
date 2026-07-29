"use server";

/**
 * @file 기사 좋아요 등록·취소 서버 액션
 * (KAN-308, web 이식 KAN-330, `POST`·`DELETE /api/v1/articles/{articleId}/like`).
 *
 * 보호 API라 HttpOnly 쿠키의 access 토큰을 Bearer로 실어야 하는데 클라는 그
 * 쿠키를 못 읽으므로 서버 액션을 경유한다. 댓글 작성(`comment-actions.ts`)과
 * 같은 이유·같은 모양이다. 쿠키 이름이 앱에 박혀 있어 승격하지 않고 모바일
 * `_services/article-likes.ts`를 복제했다.
 *
 * 티켓 제목은 `GET, DELETE`지만 실제 계약은 `POST, DELETE`다 — 상태 조회 GET은
 * 아예 없고(핸들러가 없어 500이 온다), 초기 좋아요 여부는 기사 조회 응답의
 * `likedByMe`로 받는다(모바일 KAN-308에서 확인한 계약, ADR 0044).
 *
 * 두 메서드 모두 멱등이다. 이미 누른 기사에 POST를 또 보내도, 안 누른 기사에
 * DELETE를 보내도 409가 아니라 200에 현재 카운트가 온다. 그래서 낙관적 갱신이
 * 실패해 재시도해도 카운트가 어긋나지 않고, 중복 상태 분기도 필요 없다.
 */

import { cookies } from "next/headers";
import { ApiError, apiFetch } from "@plick/core/client";
import type { ToggleLikeResult } from "@plick/domain/types";
import { AUTH_COOKIES } from "@/_constants/api";

/** 두 액션이 공유하는 호출부 — 메서드만 다르고 인증·에러 처리가 같다. */
async function toggleLike(
  articleId: string,
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
      `/api/v1/articles/${encodeURIComponent(articleId)}/like`,
      { method, headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return { ok: true, likeCount };
  } catch (e) {
    if (e instanceof ApiError) {
      return { ok: false, status: e.status, code: e.code, message: e.message };
    }
    console.error("[likes] 좋아요 토글 실패:", e);
    return {
      ok: false,
      status: 0,
      code: "NETWORK",
      message: "좋아요를 반영하지 못했어요. 잠시 후 다시 시도해 주세요.",
    };
  }
}

/**
 * 좋아요를 등록한다.
 *
 * @param articleId 기사(릴) id — 릴스와 기사가 같은 `articleSummaryId` 체계다
 * @returns 성공이면 BE가 계산한 최신 좋아요 수. 실패면 BE 에러 code·message.
 *   비로그인(쿠키 없음)은 BE까지 안 가고 401 `AUTH_REQUIRED`로 돌려주고,
 *   없는 기사는 404 `ARTICLE_NOT_FOUND`로 온다.
 */
export async function likeArticle(
  articleId: string,
): Promise<ToggleLikeResult> {
  return toggleLike(articleId, "POST");
}

/**
 * 좋아요를 취소한다. 에러 규약은 {@link likeArticle}과 같다.
 *
 * @param articleId 기사(릴) id
 */
export async function unlikeArticle(
  articleId: string,
): Promise<ToggleLikeResult> {
  return toggleLike(articleId, "DELETE");
}

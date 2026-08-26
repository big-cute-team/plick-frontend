"use server";

import { cookies } from "next/headers";
import { ApiError, apiFetch } from "@plick/core/client";
import type { ToggleBlockResult } from "@plick/domain/types";
import { AUTH_COOKIES } from "@/_constants/api";

/**
 * @file 사용자 차단·해제 서버 액션 (KAN-411,
 * `POST /api/v1/users/me/blocks`·`DELETE /api/v1/users/me/blocks/{blockedUserId}`).
 *
 * 인증 경유·실패를 값으로 돌려주는 이유는 `comment-actions.ts`와 같다.
 * 차단 목록 조회(GET)는 렌더 중 읽기라 서버 액션이 아니다 — `blocks.ts`에 따로
 * 둔다(`"use server"` 파일이 async 함수만 export할 수 있어 파일이 갈리는 것도
 * 댓글 조회/작성이 갈린 것과 같은 경위).
 *
 * 차단의 효과는 전부 서버에 있다 — 차단한 유저의 댓글은 목록에서 빠지는 게
 * 아니라 `isBlocked: true` + 마스킹된 content로 계속 내려온다(be-verify 확인).
 * 클라가 걸러낼 것은 없고 캐시의 플래그만 맞추면 된다(`useBlockUser`).
 */

/** 두 액션이 공유하는 호출부 — 메서드·경로만 다르고 인증·에러 처리가 같다. */
async function toggleBlock(
  path: string,
  method: "POST" | "DELETE",
  body?: string,
): Promise<ToggleBlockResult> {
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
    await apiFetch<null>(path, {
      method,
      headers: { Authorization: `Bearer ${accessToken}` },
      ...(body ? { body } : {}),
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof ApiError) {
      return { ok: false, status: e.status, code: e.code, message: e.message };
    }
    console.error("[block-actions] 차단 토글 실패:", e);
    return {
      ok: false,
      status: 0,
      code: "NETWORK",
      message: "요청을 반영하지 못했어요. 잠시 후 다시 시도해 주세요.",
    };
  }
}

/**
 * 사용자를 차단한다. 이미 차단한 유저를 다시 차단해도 200(멱등).
 *
 * @param blockedUserId 차단할 유저 id — 댓글 응답의 작성자 `userId`
 * @returns 성공 여부. 실패면 BE 에러 code·message — 자기 자신은 400
 *   `USER_BLOCK_SELF`, 없는 유저는 404 `USER_BLOCK_TARGET_NOT_FOUND`로 온다.
 */
export async function blockUser(
  blockedUserId: number,
): Promise<ToggleBlockResult> {
  return toggleBlock(
    "/api/v1/users/me/blocks",
    "POST",
    JSON.stringify({ blockedUserId }),
  );
}

/**
 * 사용자 차단을 해제한다. 차단하지 않은(없는 유저 포함) id로 보내도 전부
 * 200(완전 멱등, be-verify 확인)이라 실패는 사실상 인증·네트워크뿐이다.
 *
 * @param blockedUserId 차단 해제할 유저 id
 */
export async function unblockUser(
  blockedUserId: number,
): Promise<ToggleBlockResult> {
  return toggleBlock(`/api/v1/users/me/blocks/${blockedUserId}`, "DELETE");
}

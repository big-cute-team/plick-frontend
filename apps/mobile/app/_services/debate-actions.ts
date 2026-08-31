"use server";

/**
 * @file 토론 투표 서버 액션 (KAN-418, `PUT /api/v1/debates/{debateId}/vote`).
 *
 * 보호 API라 HttpOnly 쿠키의 access 토큰을 Bearer로 실어야 하는데 클라는 그
 * 쿠키를 못 읽으므로 서버 액션을 경유한다 — 좋아요(`article-likes.ts`)와 같은
 * 이유·같은 모양이다. 쿠키 이름이 앱에 박혀 있어 이 파일은 승격하지 않고
 * 앱별로 복제한다(댓글 액션과 같은 판단).
 *
 * 재투표는 에러가 아니라 입장 변경이고 같은 값이면 멱등이다 — 중복 상태 분기가
 * 필요 없고, 낙관적 갱신이 실패해 재시도해도 집계가 어긋나지 않는다.
 */

import { cookies } from "next/headers";
import { ApiError, apiFetch } from "@plick/core/client";
import type { VoteDebateResult, VoteOption } from "@plick/domain/types";
import { AUTH_COOKIES } from "@/_constants/api";

/**
 * 토론에 투표한다.
 *
 * @param debateId 토론 id
 * @param option 고른 선택지
 * @returns 성공이면 BE가 계산한 최신 집계(`voteCountA/B` + `myVote`). 실패면
 *   BE 에러 code·message. 비로그인(쿠키 없음)은 BE까지 안 가고 401
 *   `AUTH_REQUIRED`로 돌려주고, 없는 토론은 404 `DEBATE_NOT_FOUND`로 온다.
 */
export async function voteDebate(
  debateId: string,
  option: VoteOption,
): Promise<VoteDebateResult> {
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
    const result = await apiFetch<{
      voteCountA: number;
      voteCountB: number;
      myVote: VoteOption;
    }>(`/api/v1/debates/${encodeURIComponent(debateId)}/vote`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ optionType: option }),
    });
    return { ok: true, result };
  } catch (e) {
    if (e instanceof ApiError) {
      return { ok: false, status: e.status, code: e.code, message: e.message };
    }
    console.error("[debates] 투표 실패:", e);
    return {
      ok: false,
      status: 0,
      code: "NETWORK",
      message: "투표를 반영하지 못했어요. 잠시 후 다시 시도해 주세요.",
    };
  }
}

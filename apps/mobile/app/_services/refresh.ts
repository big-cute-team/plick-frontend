/**
 * @file 토큰 재발급 fetcher. refresh 토큰을 BE에 넘겨 새 access·refresh 쌍을 받아온다.
 *
 * `auth.ts`(login/logout)와 달리 이 파일은 `"use server"`가 **아니다.** 유일한 소비자가
 * edge 미들웨어(`middleware.ts`)라서다 — 서버 액션은 `next/headers`·`next/navigation`에 기대는데
 * 그건 edge 미들웨어에서 안 돈다. 그래서 쿠키 읽기·심기·리다이렉트는 미들웨어가 자기 API로 하고,
 * 이 파일은 **BE 호출과 봉투 해제만** 하는 순수 함수로 남긴다(edge·서버 어디서든 부를 수 있게).
 */

import { apiFetch } from "@/_apis/client";

/** BE 응답 shape (이 파일 로컬 — 스웨거 `TokenResponse` 그대로). access·refresh가 함께 회전된다. */
interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

/**
 * refresh 토큰으로 새 토큰 쌍을 재발급받는다. 회전 방식이라 응답의 refreshToken도 새 값이다.
 *
 * @param refreshToken 현재 refresh 쿠키 값
 * @returns 회전된 access·refresh 쌍
 * @throws {ApiError} refresh 토큰이 만료/무효거나 BE가 2xx가 아닐 때 — 호출부가 잡아 세션을 끊는다
 */
export async function refreshTokens(
  refreshToken: string,
): Promise<TokenResponse> {
  return apiFetch<TokenResponse>("/api/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

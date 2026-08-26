/**
 * @file 차단 목록 조회 fetcher (KAN-411, `GET /api/v1/users/me/blocks`).
 * 서버 렌더 중 access 쿠키를 Bearer로 실어 부른다. 렌더 중 읽기만 하고 쿠키를
 * 심지 않으므로 서버 액션이 아니다 — `profile.ts`와 같은 서버 전용 모듈.
 * 차단·해제(쓰기)는 `block-actions.ts`.
 */

import { cookies } from "next/headers";
import { ApiError, apiFetch } from "@plick/core/client";
import type { BlockedUser } from "@plick/domain/types";
import { AUTH_COOKIES } from "@/_constants/api";

/**
 * 내 차단 목록을 조회한다. 페이지네이션 없는 순수 배열이 최근 차단순으로 오고
 * (be-verify 확인), BE 응답 필드(`userId`·`nickname`·`blockedAt`)가 도메인
 * {@link BlockedUser}와 같은 모양이라 경계 변환 없이 그대로 쓴다. 유저별
 * 데이터라 공유 데이터 캐시에 남지 않게 `no-store`로 부른다.
 *
 * @returns 차단 목록 (없으면 빈 배열). 비로그인(access 쿠키 없음)이거나 토큰이
 *   무효(401)면 null — 화면이 로그인 리다이렉트로 분기한다.
 * @throws {ApiError} 401 밖의 실패(BE 다운 등) — 라우트 에러 경계가 받는다
 */
export async function getBlockedUsers(): Promise<BlockedUser[] | null> {
  const jar = await cookies();
  const accessToken = jar.get(AUTH_COOKIES.access)?.value;
  if (!accessToken) {
    return null;
  }

  try {
    return await apiFetch<BlockedUser[]>("/api/v1/users/me/blocks", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      return null;
    }
    throw e;
  }
}

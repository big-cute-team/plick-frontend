/**
 * @file 게스트 발급 fetcher (KAN-514). 토큰 없이 `POST /api/v1/auth/guest`를 불러
 * 게스트 계정과 토큰 쌍을 받아온다.
 *
 * `refresh.ts`와 같은 이유로 `"use server"`가 아니다 — 유일한 소비자가 edge에서 도는
 * 각 앱 `proxy.ts`라서, 쿠키 심기와 리다이렉트는 프록시가 자기 API로 하고 이 파일은
 * BE 호출과 봉투 해제만 하는 순수 함수로 남긴다. 두 앱(mobile·web)이 같은 계약을
 * 쓰므로 처음부터 여기 둔다(ADR 0011 게이트 C).
 */

import { apiFetch } from "./client";

/** BE 응답 shape (이 파일 로컬 — 스웨거 `GuestResponse` 그대로). */
export interface GuestResponse {
  accessToken: string;
  refreshToken: string;
  /** 게스트는 항상 true. 온보딩 흐름을 내려둔 상태라 지금은 읽지 않는다. */
  needsOnboarding: boolean;
  /** 항상 true. 서버가 채워 주는 값을 그대로 둔다(토큰을 해석하지 않기 위해). */
  isGuest: boolean;
  /** 게스트 마감(KST ISO-8601). 생성 시점 + 14일 고정이고 재발급으로 늘어나지 않는다. */
  guestExpiresAt: string;
}

/**
 * 게스트 계정을 발급받는다. 같은 기기에서 다시 부르면 **새 게스트가 생기므로**
 * 호출부는 토큰 쿠키가 하나도 없을 때만 불러야 한다.
 *
 * @returns 토큰 쌍과 게스트 마감 시각
 * @throws {ApiError} BE가 2xx가 아닐 때 — 특히 같은 IP 분당 60회를 넘기면 429
 *   `COMMON_RATE_LIMITED`. 호출부(proxy)는 실패를 삼키고 익명으로 통과시킨다
 */
export async function issueGuest(): Promise<GuestResponse> {
  return apiFetch<GuestResponse>("/api/v1/auth/guest", { method: "POST" });
}

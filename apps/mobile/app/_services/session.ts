/**
 * @file 서버 렌더 중 로그인 여부를 읽는 세션 헬퍼.
 * 서버 액션이 아니라(요청을 부르는 게 아니라 렌더 중 쿠키를 읽을 뿐) `"use server"`를 붙이지 않는다.
 */

import { cookies } from "next/headers";
import { AUTH_COOKIES } from "@/_constants/api";

/**
 * 로그인 여부 — accessToken 쿠키의 존재만으로 판단한다(BE 호출 없이 요청 컨텍스트에서).
 * 토큰 유효성 검증은 보호 API를 붙일 때 그 호출이 겸한다. 지금은 화면 분기용 신호만 필요하다.
 */
export async function isLoggedIn(): Promise<boolean> {
  const jar = await cookies();
  return jar.has(AUTH_COOKIES.access);
}

/**
 * 서버 렌더 중 access 토큰을 꺼낸다 — 읽기 fetch에 Bearer로 실을 때 쓴다(KAN-308).
 *
 * 기사·릴스 조회는 토큰 없이도 200이 오는 공개 API지만, 토큰이 있으면 응답의
 * `likedByMe`가 그 유저 기준으로 계산된다. 안 실으면 항상 false로 와서 좋아요를
 * 누른 뒤 새로고침하면 하트가 빈 채로 카운트만 올라가 있다.
 *
 * 만료된 토큰을 실어 401로 화면 전체가 죽는 걱정은 없다 — access 쿠키의 수명이
 * 곧 토큰 수명이라(`ACCESS_TOKEN_MAX_AGE`) 만료되면 쿠키 자체가 사라져 여기서
 * undefined가 되고, 호출부는 익명으로 부른다.
 *
 * @returns 로그인 중이면 access 토큰, 아니면 undefined
 */
export async function getAccessToken(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(AUTH_COOKIES.access)?.value;
}

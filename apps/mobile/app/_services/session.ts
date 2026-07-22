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

/**
 * @file 데이터 레이어 상수. `"use server"` 파일(auth.ts)은 함수만 export할 수 있어
 * 상수는 여기로 분리한다. 앱 상수(TABS 등)는 `@/_lib/constants`.
 */

/**
 * 소셜 로그인 인가 코드 자리 — 지금 BE는 mock-auth라 아무 문자열이나 받는다.
 * 실제 OAuth 리다이렉트가 붙으면 프로바이더가 주는 code로 교체된다.
 */
export const AUTH_MOCK_CODE = "mock";

/** 토큰을 담는 HttpOnly 쿠키 이름 (login이 심고, 이후 보호 API·refresh가 읽는다) */
export const AUTH_COOKIES = {
  access: "accessToken",
  refresh: "refreshToken",
} as const;

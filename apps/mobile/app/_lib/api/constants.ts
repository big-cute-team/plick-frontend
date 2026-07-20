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

/**
 * 토큰 쿠키 공통 옵션 — HttpOnly라 브라우저 JS로 못 읽고, 심기·지우기를 전부 서버에서 한다.
 * `maxAge`만 심는 쪽에서 토큰별로 붙인다(아래 TTL). `secure`는 프로덕션에서만(로컬 http 개발 위해).
 */
export const AUTH_COOKIE_BASE = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: process.env.NODE_ENV === "production",
} as const;

/**
 * access·refresh 쿠키 수명(초). BE 토큰 자체엔 만료 정보가 없어(현재 mock은 불투명 문자열),
 * **쿠키의 소멸을 만료 신호로 삼는다** — access가 짧게 살다 사라지면 미들웨어가 refresh로 갈아낀다.
 * 실제 토큰 TTL이 정해지면 그 값에 맞춘다(인증 봉합점). 지금은 흔한 관례값을 자리로 둔다.
 */
export const ACCESS_TOKEN_MAX_AGE = 60 * 15; // 15분
export const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 14; // 14일

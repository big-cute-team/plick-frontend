/**
 * @file 데이터 레이어 상수. `"use server"` 파일(auth.ts)은 함수만 export할 수 있어
 * 상수는 여기로 분리한다. 앱 상수는 `@/_constants/app`, 탭 구성은 `@/_constants/tabs`.
 */

import type { SocialProvider } from "@/_types/api";

/**
 * 프로바이더별 OAuth 인가 엔드포인트와 고정 파라미터 (KAN-257, KAN-395 APPLE 추가).
 * 환경마다 달라지는 client_id·redirect_uri는 env로 읽는다 — 조립은 `oauth.ts`.
 *
 * `extraParams` — 프로바이더가 추가로 요구하는 고정 쿼리.
 * - 구글: `scope` 필수. `prompt=select_account`은 이전에 고른 계정이 남아 있어도
 *   계정 선택 창을 다시 띄운다(KAN-395) — 로그아웃 뒤 다른 계정으로 재로그인하려는데
 *   같은 세션으로 자동 통과되던 문제 해결.
 * - 카카오: `prompt=login`은 카카오톡·카카오계정 세션이 살아 있어도 로그인 창을 다시
 *   띄운다(KAN-395, 같은 이유).
 * - 애플(KAN-395): `response_type=code`만으로 GET 콜백으로 돌아오려면 scope를 요구하지
 *   않는다 — scope를 붙이면 `response_mode=form_post`가 강제돼 콜백이 POST로 바뀐다.
 *   유저 식별은 BE가 code 교환으로 받는 id_token의 sub로 해결한다.
 *   애플은 HTTPS 콜백만 받으므로 로컬에선 인가 왕복이 성립하지 않는다(dev 배포에서 검증).
 */
export const OAUTH_AUTHORIZE: Record<
  SocialProvider,
  { endpoint: string; clientIdEnv: string; extraParams: Record<string, string> }
> = {
  KAKAO: {
    endpoint: "https://kauth.kakao.com/oauth/authorize",
    clientIdEnv: "KAKAO_CLIENT_ID",
    extraParams: { prompt: "login" },
  },
  GOOGLE: {
    endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    clientIdEnv: "GOOGLE_CLIENT_ID",
    extraParams: { scope: "openid email", prompt: "select_account" },
  },
  APPLE: {
    endpoint: "https://appleid.apple.com/auth/authorize",
    clientIdEnv: "APPLE_CLIENT_ID",
    extraParams: {},
  },
};

/**
 * OAuth `state`(CSRF 방지 난수)를 인가 왕복 동안 들고 있는 HttpOnly 쿠키.
 * 값은 `프로바이더:난수` — 콜백 주소가 프로바이더 공용이라 어느 쪽에서 돌아왔는지도 여기서 안다.
 * 왕복은 수 초면 끝나므로 수명은 넉넉한 10분만 준다.
 */
export const OAUTH_STATE_COOKIE = "oauthState";
export const OAUTH_STATE_MAX_AGE = 60 * 10; // 10분

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
 * access·refresh 쿠키 수명(초). 쿠키의 소멸을 만료 신호로 삼는다 — access가 먼저 사라지면
 * `proxy.ts`가 refresh로 갈아낀다. BE 확정값(HS256 JWT, exp 포함): access 1시간, refresh 14일.
 * access 쿠키는 시계 오차를 감안해 토큰보다 5분 짧은 55분으로 둔다 — 만료 임박 토큰을
 * Bearer로 실어 401을 맞는 경계 구간을 없애기 위해서다.
 */
export const ACCESS_TOKEN_MAX_AGE = 60 * 55; // 55분 (BE 토큰 1시간 − 오차 여유 5분)
export const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 14; // 14일 (BE와 동일)

/**
 * 재발급 경쟁 1회 재시도 가드 쿠키. 프로덕션 FE는 인스턴스 2대라 access 만료 직후
 * 버스트 요청이 서로 다른 인스턴스에서 같은 refresh 토큰으로 재발급을 불러, 1회용
 * 회전에서 진 쪽이 401을 받는다. `proxy.ts`는 이때 같은 URL로 1회만 재시도
 * 리다이렉트하는데 이 쿠키가 그 "1회"를 센다. 수명은 재시도 왕복이면 충분한 15초.
 */
export const REFRESH_RETRY_COOKIE = "refreshRetry";
export const REFRESH_RETRY_MAX_AGE = 15; // 초

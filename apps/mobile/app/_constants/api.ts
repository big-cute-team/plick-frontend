/**
 * @file 데이터 레이어 상수. `"use server"` 파일(auth.ts)은 함수만 export할 수 있어
 * 상수는 여기로 분리한다. 앱 상수(TABS 등)는 `@/_constants/app`.
 */

import type { TeamCode } from "@plick/domain/types";
import type { SocialProvider } from "@/_types/api";

/**
 * 팀 코드 → BE `teams.team_id` 매핑 (KAN-264). 온보딩·프로필 수정의 `teamIds` 요청에 쓴다.
 *
 * ⚠️ BE에 팀 목록 조회 API가 없어 실제 DB(teams 테이블) 값을 상수로 박아둔 계약 공백이다.
 * teams는 어드민이 쓰기 소유하는 마스터 데이터라 재시드되면 조용히 어긋난다(실제로
 * KAN-264 작업 중 7~12 → 1~6으로 바뀐 적 있다). 어긋나면 요청이 400 "존재하지 않는
 * 팀입니다"로 드러난다 — `GET /teams` 류가 생기면 이 상수를 걷어내고 조회로 교체한다.
 */
export const TEAM_IDS: Record<TeamCode, number> = {
  MUN: 1,
  MCI: 2,
  LIV: 3,
  ARS: 4,
  CHE: 5,
  TOT: 6,
};

/**
 * `TEAM_IDS`의 역방향 — BE `team_id` → 팀 코드 (KAN-271).
 * 기사 피드 응답의 `teams`가 id 배열로 와서 화면 표시용 코드로 되돌릴 때 쓴다.
 * 위 매핑에서 파생시켜 두 방향이 갈라지지 않게 한다.
 */
export const TEAM_CODES: Record<number, TeamCode> = Object.fromEntries(
  Object.entries(TEAM_IDS).map(([code, id]) => [id, code as TeamCode]),
);

/**
 * 프로바이더별 OAuth 인가 엔드포인트와 고정 파라미터 (KAN-257).
 * 환경마다 달라지는 client_id·redirect_uri는 env로 읽는다 — 조립은 `oauth.ts`.
 *
 * `extraParams` — 프로바이더가 추가로 요구하는 고정 쿼리 (구글은 scope 필수).
 */
export const OAUTH_AUTHORIZE: Record<
  SocialProvider,
  { endpoint: string; clientIdEnv: string; extraParams: Record<string, string> }
> = {
  KAKAO: {
    endpoint: "https://kauth.kakao.com/oauth/authorize",
    clientIdEnv: "KAKAO_CLIENT_ID",
    extraParams: {},
  },
  GOOGLE: {
    endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    clientIdEnv: "GOOGLE_CLIENT_ID",
    extraParams: { scope: "openid email" },
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
 * access·refresh 쿠키 수명(초). BE 토큰 자체엔 만료 정보가 없어(현재 mock은 불투명 문자열),
 * **쿠키의 소멸을 만료 신호로 삼는다** — access가 짧게 살다 사라지면 미들웨어가 refresh로 갈아낀다.
 * 실제 토큰 TTL이 정해지면 그 값에 맞춘다(인증 봉합점). 지금은 흔한 관례값을 자리로 둔다.
 */
export const ACCESS_TOKEN_MAX_AGE = 60 * 15; // 15분
export const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 14; // 14일

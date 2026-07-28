/**
 * @file 데이터 레이어 상수. `"use server"` 파일(auth.ts)은 함수만 export할 수 있어
 * 상수는 여기로 분리한다. 앱 상수(TABS 등)는 `@/_constants/app`.
 */

import { TEAM_IDS } from "@plick/domain/constants";
import type { RumorStage, TeamCode } from "@plick/domain/types";
import type { SocialProvider } from "@/_types/api";

/**
 * `TEAM_IDS`(web 이식 KAN-319에서 `@plick/domain`으로 승격)의 역방향 —
 * BE `team_id` → 팀 코드 (KAN-271).
 * 기사 피드 응답의 `teams`가 id 배열로 와서 화면 표시용 코드로 되돌릴 때 쓴다.
 * 위 매핑에서 파생시켜 두 방향이 갈라지지 않게 한다.
 */
export const TEAM_CODES: Record<number, TeamCode> = Object.fromEntries(
  Object.entries(TEAM_IDS).map(([code, id]) => [id, code as TeamCode]),
);

/**
 * BE 팀 한글 정식 명칭(`teams.name_ko`) → 팀 코드 (KAN-283).
 *
 * 기사 상세 응답엔 `teams` id 배열이 없고 해시태그로 팀 한글명만 내려와서,
 * 이 테이블로 역산한다. 해시태그는 구조적으로 `teams.name_ko` 6종의
 * 부분집합만 온다(BE `team_tags`가 teams FK 전용이라 인물 태그는 미지원).
 *
 * ⚠️ 값은 도메인 `TEAMS[].name`(아스날·맨유 같은 축약 표기)과 6팀 중 4팀이
 * 달라 파생시킬 수 없고, `TEAM_IDS`처럼 실제 DB 값을 박아둔 계약 공백이다.
 * 재시드로 표기가 바뀌면 팀 칩이 조용히 빠지는 걸로 드러난다. BE
 * `teams.short_name`이 팀 코드와 정확히 일치하므로 해시태그에 코드를 함께
 * 내려주는 API가 생기면 이 테이블을 걷어낸다.
 */
export const TEAM_BY_KO_NAME: Record<string, TeamCode> = {
  "맨체스터 유나이티드": "MUN",
  "맨체스터 시티": "MCI",
  리버풀: "LIV",
  아스널: "ARS",
  첼시: "CHE",
  "토트넘 핫스퍼": "TOT",
};

/**
 * BE 루머 단계 값 → 도메인 `RumorStage` (KAN-271, KAN-276).
 *
 * 철자가 한 글자 다르다. BE와 DB는 미국식 `RUMOR`, 도메인 타입은 영국식 `RUMOUR`다.
 * 캐스팅으로 넘기면 `STAGE_META["RUMOR"]`가 undefined가 되어 배지 자리에서 런타임에
 * 터지므로 반드시 이 테이블을 거친다. 모르는 값은 null로 떨어져 배지가 안 그려질
 * 뿐이다 — 잘못된 배지보다 없는 배지가 낫다.
 *
 * 기사 피드와 릴스 피드가 같은 값을 쓰므로 두 fetcher가 함께 참조한다.
 */
export const STAGE_BY_BE_VALUE: Record<string, RumorStage> = {
  RUMOR: "RUMOUR",
  IN_PROGRESS: "IN_PROGRESS",
  /* CONFIRM은 BE 예정 단계 — 아직 enum·DB에 없고 값이 오기 시작하면 그대로 통과한다 (KAN-299) */
  CONFIRM: "CONFIRM",
  OFFICIAL: "OFFICIAL",
};

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
 * **쿠키의 소멸을 만료 신호로 삼는다** — access가 짧게 살다 사라지면 `proxy.ts`가 refresh로 갈아낀다.
 * 실제 토큰 TTL이 정해지면 그 값에 맞춘다(인증 봉합점). 지금은 흔한 관례값을 자리로 둔다.
 */
export const ACCESS_TOKEN_MAX_AGE = 60 * 15; // 15분
export const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 14; // 14일

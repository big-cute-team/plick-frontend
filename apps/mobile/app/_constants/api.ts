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
 *   띄운다(KAN-395, 같은 이유). `scope`는 동의 화면에 띄울 항목을 고르는 값이다(쉼표 구분,
 *   KAN-476). 이미 가입한 계정은 콘솔에서 동의 항목을 켜도 그것만으로는 다시 묻지 않아
 *   연령대·성별이 비는데, scope에 적으면 다음 로그인 때 추가 동의 화면이 뜬다.
 *   scope를 주면 적은 항목만 묻게 되므로 지금 받고 있는 `account_email`도 같이 적는다 —
 *   빼면 신규 가입자의 이메일이 안 들어온다. 선택 동의 항목이라 거부해도 로그인은 이어지고,
 *   값은 BE가 저장한다(KAN-475). 콘솔에서 켜지 않은 항목을 적으면 인가가 오류로 막히니
 *   동의 항목을 먼저 켜고 배포한다.
 *   `age_range`·`gender`는 KAN-555에서 잠시 뺐다 — 카카오 비즈 앱 심사가 아직 진행 중이라
 *   콘솔에서 항목이 열리지 않은 상태다. 심사가 끝나면 `account_email,age_range,gender`로 되돌린다.
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
    extraParams: {
      scope: "account_email",
      prompt: "login",
    },
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

/**
 * 게스트 마감 시각(BE `guestExpiresAt`)을 들고 있는 쿠키 (KAN-514).
 *
 * `/users/me`는 `isGuest`만 주고 마감 시각은 게스트 발급·재발급 응답에만 실려 온다.
 * 화면은 "N월 N일까지 연동하면 기록이 이어져요"를 매 렌더 띄워야 하는데 그때마다
 * 재발급을 부를 수는 없으니, 받은 시점에 여기 적어 두고 서버 렌더가 읽는다.
 *
 * 이 쿠키의 **존재 자체가 "지금 세션은 게스트"라는 신호**이기도 하다. 프록시는
 * edge에서 돌아 `/users/me`를 부를 수 없어 재발급 401이 게스트 마감인지 소셜 세션
 * 만료인지 구별할 방법이 이것뿐이다. 소셜로 연동·로그인하면 지운다.
 * HttpOnly로 두는 이유는 토큰 쿠키와 같다 — 읽는 쪽이 전부 서버다.
 */
export const GUEST_EXPIRES_COOKIE = "guestExpiresAt";

/**
 * 게스트를 **방금** 발급했다는 1회용 표식 (KAN-514). 프록시가 심고, 첫 진입 안내
 * 토스트를 띄운 클라 컴포넌트가 지운다.
 *
 * 토큰 쿠키와 달리 HttpOnly가 아니다 — 토스트를 한 번만 띄우려면 띄운 쪽이
 * 표식을 지워야 하는데, 그 자리가 브라우저이기 때문이다. 담기는 값이 안내 종류
 * 하나뿐이라 노출돼도 잃을 게 없다. 토스트를 못 띄우고 넘어가도 수명이 지나면 사라진다.
 *
 * 값은 {@link GUEST_NOTICE}의 둘 중 하나다. 안내 문구를 쿠키에 담지 않고 종류만
 * 담는 이유: 쿠키 값은 브라우저에서 고칠 수 있어, 문구를 그대로 실으면 아무 문장이나
 * 우리 토스트로 띄울 수 있다. 모르는 값이면 토스트 쪽에서 무시한다.
 */
export const GUEST_NOTICE_COOKIE = "guestNotice";
export const GUEST_NOTICE_MAX_AGE = 60 * 5; // 5분

/**
 * 게스트 안내 토스트 종류 (KAN-514).
 * - `issued`: 첫 진입에 게스트를 발급했다 → 마감까지 연동하면 기록이 이어진다는 안내
 * - `existing`: 연동했는데 그 소셜 계정이 이미 있어(`linked=false`, `EXISTING_ACCOUNT`)
 *   기존 계정으로 로그인됐다 → 게스트 기록은 안 넘어왔다는 안내
 */
export const GUEST_NOTICE = {
  issued: "issued",
  existing: "existing",
} as const;

/**
 * 게스트를 발급하지 않을 크롤러 User-Agent (KAN-514).
 *
 * 게스트는 users 행 하나라 방문 한 번에 계정 하나가 생긴다. 검색 크롤러는 사이트를
 * 수백 페이지씩 훑으므로 그대로 두면 사람이 아닌 계정이 DB를 채운다. 더 큰 문제는
 * 캐시다 — 토큰을 실은 요청은 `apiFetch`가 `no-store`로 돌리는데(유저별 값이 섞이지
 * 않게), 크롤러에 토큰이 붙으면 익명 GET 60초 캐시(KAN-380)가 통째로 무력해져
 * 크롤 경로가 느려진다. 그래서 크롤러는 지금처럼 익명으로 둔다.
 *
 * 패턴을 정확히 맞히지 못해도 손해가 작다 — 못 걸러낸 크롤러는 게스트 계정 하나를
 * 만들 뿐이고, 사람을 크롤러로 잘못 보면 게스트 없이 둘러보던 예전 동작이 된다.
 */
export const CRAWLER_UA_PATTERN =
  /bot|crawler|spider|crawling|slurp|facebookexternalhit|embedly|quora link preview|showyoubot|outbrain|pinterest|vkshare|w3c_validator|whatsapp|telegram|lighthouse|headlesschrome/i;

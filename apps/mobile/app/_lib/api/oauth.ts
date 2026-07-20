/**
 * @file OAuth 인가 요청 순수 헬퍼 — 인가 URL 조립과 state 쿠키 값 포장/해석.
 * 리다이렉트 자체는 `auth.ts`의 `startSocialLogin`이, 콜백 처리(code→토큰)는
 * `app/oauth/callback/route.ts`가 한다.
 */

import { OAUTH_AUTHORIZE } from "./constants";
import type { SocialProvider } from "./types";

/** 프로바이더가 code를 돌려보낼 우리 쪽 콜백 주소 — 배포 환경에선 env로 교체한다 */
function redirectUri(): string {
  return (
    process.env.OAUTH_REDIRECT_URI ?? "http://localhost:3001/oauth/callback"
  );
}

/**
 * 프로바이더 인가 URL을 조립한다 (인가 코드 그랜트 — response_type=code).
 *
 * @param provider 카카오/구글
 * @param state CSRF 방지 난수 — 콜백에서 쿠키 값과 대조한다
 * @throws client_id env가 비어 있으면 — 호출부(서버 액션)가 잡아 에러 UI로 바꾼다
 */
export function buildAuthorizeUrl(
  provider: SocialProvider,
  state: string,
): string {
  const { endpoint, clientIdEnv, extraParams } = OAUTH_AUTHORIZE[provider];
  const clientId = process.env[clientIdEnv];
  if (!clientId) throw new Error(`${clientIdEnv} env가 설정되지 않았다`);

  const url = new URL(endpoint);
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(),
    response_type: "code",
    state,
    ...extraParams,
  }).toString();
  return url.toString();
}

/** state 쿠키 값 만들기 — `프로바이더:난수` (uuid에는 `:`가 없어 안전하게 되가른다) */
export function packOAuthState(provider: SocialProvider, state: string) {
  return `${provider}:${state}`;
}

/**
 * state 쿠키 값을 되갈라 검증 가능한 형태로 돌려준다.
 * 형식이 깨졌거나 모르는 프로바이더면 null — 콜백이 실패로 처리한다.
 */
export function parseOAuthState(
  value: string,
): { provider: SocialProvider; state: string } | null {
  const index = value.indexOf(":");
  if (index < 0) return null;
  const provider = value.slice(0, index);
  const state = value.slice(index + 1);
  if (!(provider in OAUTH_AUTHORIZE) || !state) return null;
  return { provider: provider as SocialProvider, state };
}

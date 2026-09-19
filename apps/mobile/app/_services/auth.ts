"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError, apiFetch } from "@plick/core/client";
import {
  ACCESS_TOKEN_MAX_AGE,
  AUTH_COOKIE_BASE,
  AUTH_COOKIES,
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
} from "@/_constants/api";
import { buildAuthorizeUrl, getRedirectUri, packOAuthState } from "./oauth";
import type { SocialProvider } from "@/_types/api";

/** BE 응답 shape (이 파일 로컬 — 스웨거 `LoginResponse` 그대로). */
interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  /** true면 신규 자동가입 유저. 온보딩 흐름을 내려서 지금은 읽지 않는다 — BE가 계속 주는 필드라 shape만 유지한다. */
  needsOnboarding: boolean;
}

/**
 * 소셜 로그인 시작 서버 액션 (KAN-257) — CSRF 방지 state를 쿠키에 심고
 * 프로바이더 인가 페이지로 리다이렉트한다. 사용자가 동의하면 프로바이더가
 * `/oauth/callback`으로 code를 돌려보내고, 거기서 `login`이 마무리한다.
 *
 * @param provider 카카오/구글 버튼이 넘기는 프로바이더
 * @returns 실패 시(설정 누락) 화면이 보여줄 에러 메시지. 성공 시 redirect라 반환하지 않는다.
 */
export async function startSocialLogin(
  provider: SocialProvider,
): Promise<{ error: string } | undefined> {
  const state = crypto.randomUUID();

  let authorizeUrl: string;
  try {
    authorizeUrl = buildAuthorizeUrl(provider, state);
  } catch {
    return { error: "로그인에 실패했어요. 잠시 후 다시 시도해 주세요." };
  }

  const jar = await cookies();
  jar.set(OAUTH_STATE_COOKIE, packOAuthState(provider, state), {
    ...AUTH_COOKIE_BASE,
    maxAge: OAUTH_STATE_MAX_AGE,
  });

  redirect(authorizeUrl);
}

/**
 * 소셜 로그인 마무리 — 프로바이더가 준 인가 code를 BE에 넘겨 토큰을 받고
 * HttpOnly 쿠키로 심은 뒤 홈으로 보낸다. 콜백 라우트(`/oauth/callback`)가 부른다.
 * 신규 유저를 온보딩으로 보내던 분기는 온보딩 흐름을 내리면서 뺐다 — BE가
 * 가입 시 닉네임을 자동 부여하므로 온보딩 없이도 서비스 이용에 지장이 없다.
 * 토큰이 브라우저 JS에 노출되지 않도록 BE 호출·저장을 전부 서버에서 한다.
 * `redirectUri`는 인가 요청 때 쓴 콜백 주소 그대로다(KAN-341) — BE가 허용목록
 * 검증 후 프로바이더 토큰 교환에 재사용하므로 다르면 400으로 끊긴다.
 *
 * 탈퇴 후 7일이 안 지난 계정이면 BE가 403 `AUTH_REJOIN_RESTRICTED`를 준다(KAN-393).
 * 재시도해도 소용없는 실패라 공통 문구에 합치지 않고 `rejoinRestrictedUntil`로
 * 구분해 돌려준다 — 콜백이 재가입 가능 시각 안내로 보낸다.
 *
 * @param provider state 쿠키에서 복원한 프로바이더
 * @param code 프로바이더가 콜백으로 돌려준 인가 코드
 * @returns 실패 시 호출부가 처리할 에러 메시지. 재가입 제한이면 `rejoinRestrictedUntil`
 *   (BE `rejoinableAt`, 응답에 없으면 null)을 함께 준다. 성공 시 redirect라 반환하지 않는다.
 */
export async function login(
  provider: SocialProvider,
  code: string,
): Promise<
  { error: string; rejoinRestrictedUntil?: string | null } | undefined
> {
  let data: LoginResponse;
  try {
    data = await apiFetch<LoginResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ provider, code, redirectUri: getRedirectUri() }),
    });
  } catch (e) {
    if (e instanceof ApiError && e.code === "AUTH_REJOIN_RESTRICTED") {
      const rejoinableAt = (e.data as { rejoinableAt?: string } | null)
        ?.rejoinableAt;
      return { error: e.message, rejoinRestrictedUntil: rejoinableAt ?? null };
    }
    // 화면엔 공통 문구만 나가므로 실제 실패 사유는 서버 로그로만 남는다
    console.error("[oauth] BE login 실패:", e);
    return { error: "로그인에 실패했어요. 잠시 후 다시 시도해 주세요." };
  }

  const jar = await cookies();
  jar.set(AUTH_COOKIES.access, data.accessToken, {
    ...AUTH_COOKIE_BASE,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  jar.set(AUTH_COOKIES.refresh, data.refreshToken, {
    ...AUTH_COOKIE_BASE,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });

  redirect("/");
}

/**
 * 로그아웃 서버 액션 — BE에 로그아웃을 알리고 토큰 쿠키를 지운 뒤 홈으로 보낸다(KAN-300).
 * BE 호출이 실패해도 로컬 세션은 반드시 끊는다(쿠키 삭제) — 로그아웃을 못 하는 상태에 갇히지 않게.
 * 토큰은 HttpOnly라 브라우저 JS로 못 지우므로, login과 대칭으로 삭제도 서버에서 한다.
 */
export async function logout(): Promise<void> {
  try {
    await apiFetch("/api/v1/auth/logout", { method: "POST" });
  } catch {
    // BE가 죽어도 아래에서 쿠키를 지워 로그아웃은 성립시킨다
  }

  const jar = await cookies();
  jar.delete(AUTH_COOKIES.access);
  jar.delete(AUTH_COOKIES.refresh);

  redirect("/");
}

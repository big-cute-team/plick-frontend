"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError, apiFetch } from "@plick/core/client";
import {
  ACCESS_TOKEN_MAX_AGE,
  AUTH_COOKIE_BASE,
  AUTH_COOKIES,
  GUEST_EXPIRES_COOKIE,
  GUEST_NOTICE,
  GUEST_NOTICE_COOKIE,
  GUEST_NOTICE_MAX_AGE,
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
 * 소셜 로그인 시작 서버 액션 (KAN-318, 모바일 KAN-257 이식) — CSRF 방지 state를
 * 쿠키에 심고 프로바이더 인가 페이지로 리다이렉트한다. 사용자가 동의하면 프로바이더가
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
  /* 연동이 아니라 별도 로그인이므로 게스트 표식은 버린다 (KAN-514) */
  jar.delete(GUEST_EXPIRES_COOKIE);

  redirect("/");
}

/** BE 응답 shape (이 파일 로컬 — 스웨거 `LinkResponse` 그대로). */
interface LinkResponse {
  accessToken: string;
  refreshToken: string;
  needsOnboarding: boolean;
  /** true면 게스트 행이 소셜로 바뀌어 기록이 이어졌다. false면 기존 계정으로 로그인됐다. */
  linked: boolean;
  /** `linked`가 false일 때 `EXISTING_ACCOUNT`. 아니면 null. */
  reason: string | null;
}

/**
 * 게스트 → 소셜 연동 마무리 (KAN-514) — `login`의 게스트 갈래다. 요청 본문은 로그인과
 * 똑같고 엔드포인트만 `/auth/link`이며, **게스트 액세스 토큰을 Bearer로 실어야** 한다.
 *
 * 기록이 이어지는 원리: BE가 게스트의 users 행을 지우고 새로 만드는 게 아니라 같은 행의
 * provider·provider_id만 소셜 값으로 바꾼다. userId가 그대로라 좋아요·조회 기록·투표·마이팀이
 * 저절로 따라온다. 그래서 FE가 이관을 위해 할 일이 따로 없다 — 토큰만 갈아끼우면 된다.
 *
 * 응답 토큰은 어느 갈래든 소셜 사용자의 것이라(게스트 표식 없음) 마감 쿠키를 지운다.
 * 그 소셜 계정으로 이미 가입한 사용자가 있으면 BE가 기존 계정으로 로그인시키고
 * `linked=false`를 준다 — 게스트 기록은 안 넘어오므로 안내 토스트 표식을 심는다.
 *
 * 게스트가 아닌 토큰으로 부르면 BE가 400 `AUTH_LINK_NOT_GUEST`를 준다. 화면이 `isGuest`로
 * 버튼을 가르니 정상 흐름에선 안 나오지만, 마감 쿠키와 실제 토큰이 어긋난 경우(수동 삭제,
 * 옛 탭에서 온 콜백)에 대비해 일반 로그인으로 떨어뜨린다 — 사용자에겐 그냥 로그인이 된다.
 *
 * @param provider state 쿠키에서 복원한 프로바이더
 * @param code 프로바이더가 콜백으로 돌려준 인가 코드
 * @returns 실패 시 호출부가 처리할 에러 메시지(`login`과 같은 모양). 성공 시 redirect라 반환하지 않는다
 */
export async function linkSocial(
  provider: SocialProvider,
  code: string,
): Promise<
  { error: string; rejoinRestrictedUntil?: string | null } | undefined
> {
  const jar = await cookies();
  const guestAccessToken = jar.get(AUTH_COOKIES.access)?.value;
  if (!guestAccessToken) {
    return login(provider, code);
  }

  let data: LinkResponse;
  try {
    data = await apiFetch<LinkResponse>("/api/v1/auth/link", {
      method: "POST",
      headers: { Authorization: `Bearer ${guestAccessToken}` },
      body: JSON.stringify({ provider, code, redirectUri: getRedirectUri() }),
    });
  } catch (e) {
    if (e instanceof ApiError && e.code === "AUTH_LINK_NOT_GUEST") {
      /* 인가 코드는 1회용이라 여기서 다시 쓸 수 없다 — 로그인 화면으로 돌려보낸다 */
      console.error("[oauth] 게스트가 아닌 토큰으로 연동 시도:", e);
      return { error: "로그인에 실패했어요. 잠시 후 다시 시도해 주세요." };
    }
    if (e instanceof ApiError && e.code === "AUTH_REJOIN_RESTRICTED") {
      const rejoinableAt = (e.data as { rejoinableAt?: string } | null)
        ?.rejoinableAt;
      return { error: e.message, rejoinRestrictedUntil: rejoinableAt ?? null };
    }
    console.error("[oauth] BE link 실패:", e);
    return { error: "로그인에 실패했어요. 잠시 후 다시 시도해 주세요." };
  }

  jar.set(AUTH_COOKIES.access, data.accessToken, {
    ...AUTH_COOKIE_BASE,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  jar.set(AUTH_COOKIES.refresh, data.refreshToken, {
    ...AUTH_COOKIE_BASE,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
  jar.delete(GUEST_EXPIRES_COOKIE);
  if (!data.linked) {
    jar.set(GUEST_NOTICE_COOKIE, GUEST_NOTICE.existing, {
      ...AUTH_COOKIE_BASE,
      httpOnly: false,
      maxAge: GUEST_NOTICE_MAX_AGE,
    });
  }

  redirect("/");
}

/**
 * 로그아웃 서버 액션 — BE에 로그아웃을 알리고 토큰 쿠키를 지운 뒤 로그인 화면으로 보낸다.
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
  jar.delete(GUEST_EXPIRES_COOKIE);

  redirect("/login");
}

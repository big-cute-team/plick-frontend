"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiFetch } from "./api";
import { AUTH_COOKIES, AUTH_MOCK_CODE, ONBOARDING_ENTRY } from "./constants";
import type { SocialProvider } from "./types";

/** BE 응답 shape (이 파일 로컬 — 스웨거 `LoginResponse` 그대로). */
interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  /** true면 신규 자동가입 유저 — 온보딩(닉네임→마이팀) 2단계로 보낸다 */
  needsOnboarding: boolean;
}

/**
 * 소셜 로그인 서버 액션 — BE에 로그인하고 토큰을 HttpOnly 쿠키로 심은 뒤 이동시킨다.
 * 신규 유저(`needsOnboarding`)는 온보딩 첫 단계로, 기존 유저는 홈으로 보낸다.
 * 토큰이 브라우저 JS에 노출되지 않도록 BE 호출·저장을 전부 서버에서 한다.
 *
 * @param provider 카카오/구글 버튼이 넘기는 프로바이더
 * @returns 실패 시 화면이 보여줄 에러 메시지. 성공 시 redirect라 반환하지 않는다.
 */
export async function login(
  provider: SocialProvider,
): Promise<{ error: string } | undefined> {
  let data: LoginResponse;
  try {
    data = await apiFetch<LoginResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ provider, code: AUTH_MOCK_CODE }),
    });
  } catch {
    return { error: "로그인에 실패했어요. 잠시 후 다시 시도해 주세요." };
  }

  const jar = await cookies();
  const options = {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  } as const;
  jar.set(AUTH_COOKIES.access, data.accessToken, options);
  jar.set(AUTH_COOKIES.refresh, data.refreshToken, options);

  redirect(data.needsOnboarding ? ONBOARDING_ENTRY : "/");
}

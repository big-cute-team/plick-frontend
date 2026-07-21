"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { TeamCode } from "@plick/domain/types";
import { ApiError, apiFetch } from "./client";
import { AUTH_COOKIES, TEAM_IDS } from "./constants";

/**
 * 온보딩 저장 서버 액션 (KAN-264) — 닉네임·응원팀을 BE에 한 번에 보낸다.
 * 첫 보호 API라 여기서 처음으로 access 쿠키를 Bearer로 실어 보낸다.
 * BE는 최초 1회만 허용(재호출 409)하므로, 이미 완료된 세션이면 홈으로 보내 흐름을 끝낸다.
 *
 * @param nickname 1단계에서 정한 닉네임 (BE가 금지어·중복을 다시 검사한다)
 * @param teams 2단계에서 고른 응원팀 코드 목록 — 다중 선택, 안 골라도 된다(빈 배열 허용)
 * @returns 실패 시 화면이 보여줄 에러 메시지. 성공 시 redirect라 반환하지 않는다.
 */
export async function submitOnboarding(
  nickname: string,
  teams: TeamCode[],
): Promise<{ error: string } | undefined> {
  const jar = await cookies();
  const accessToken = jar.get(AUTH_COOKIES.access)?.value;
  if (!accessToken) {
    redirect("/login");
  }

  try {
    await apiFetch<void>("/api/v1/users/me/onboarding", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        nickname,
        teamIds: teams.map((c) => TEAM_IDS[c]),
      }),
    });
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.code === "USER_ALREADY_ONBOARDED") {
        redirect("/"); // 이미 완료된 유저 — 목적지(홈)로 그냥 보낸다
      }
      if (e.status === 401) {
        redirect("/login"); // 토큰 만료/무효 — 세션이 끊긴 것이므로 로그인부터
      }
      if (
        e.code === "USER_NICKNAME_DUPLICATED" ||
        e.code === "USER_NICKNAME_FORBIDDEN"
      ) {
        // BE 문구가 이미 사용자용 한국어라 그대로 보여주고, 되돌아갈 길만 덧붙인다
        return { error: `${e.message} 이전 단계에서 닉네임을 바꿔주세요.` };
      }
    }
    console.error("[onboarding] BE 저장 실패:", e);
    return { error: "저장에 실패했어요. 잠시 후 다시 시도해 주세요." };
  }

  redirect("/");
}

/**
 * 응원팀 저장 서버 액션 (KAN-268) — 프로필 수정 화면의 선택을
 * `PATCH /api/v1/users/me`로 보낸다. BE는 보낸 항목만 바꾸므로 `teamIds`만 싣는다
 * (닉네임은 수정 UI가 없어 보내지 않는다). 팀 목록은 전체 교체다 — 빈 배열이면 응원팀 해제.
 *
 * @param teams 화면에서 고른 응원팀 코드 목록 (다중, 빈 배열 허용)
 * @returns 실패 시 화면이 보여줄 에러 메시지. 성공 시 MY로 redirect라 반환하지 않는다.
 */
export async function updateMyTeams(
  teams: TeamCode[],
): Promise<{ error: string } | undefined> {
  const jar = await cookies();
  const accessToken = jar.get(AUTH_COOKIES.access)?.value;
  if (!accessToken) {
    redirect("/login");
  }

  try {
    await apiFetch<void>("/api/v1/users/me", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ teamIds: teams.map((c) => TEAM_IDS[c]) }),
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      redirect("/login"); // 토큰 만료/무효 — 세션이 끊긴 것이므로 로그인부터
    }
    console.error("[profile-edit] 응원팀 저장 실패:", e);
    return { error: "저장에 실패했어요. 잠시 후 다시 시도해 주세요." };
  }

  redirect("/me");
}

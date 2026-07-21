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

/**
 * 닉네임 중복 확인 (KAN-269) — `GET /api/v1/users/nickname-check`.
 * 익명 허용 공개 API라 토큰을 싣지 않는다. 이미 사용 중이거나 금지어면 BE가
 * `available: false`로 준다(둘을 구분하지 않으므로 화면도 하나의 "쓸 수 없음"으로 묶는다).
 *
 * 클라 버튼 클릭으로 부르지만, 서버 액션으로 두면 `apiFetch`가 서버에서 돌아
 * CORS·프록시가 필요 없고 기존 `users.ts` 관용과도 맞는다. 단발 확인이라 RQ는 아직 안 쓴다.
 *
 * @param nickname 확인할 닉네임 (호출부에서 trim해 넘긴다)
 * @returns 사용 가능 여부, 또는 조회 실패 시 화면에 보여줄 에러 메시지
 */
export async function checkNickname(
  nickname: string,
): Promise<{ available: boolean } | { error: string }> {
  try {
    const { available } = await apiFetch<{ available: boolean }>(
      `/api/v1/users/nickname-check?nickname=${encodeURIComponent(nickname)}`,
    );
    return { available };
  } catch (e) {
    console.error("[nickname-check] 확인 실패:", e);
    return { error: "확인에 실패했어요. 잠시 후 다시 시도해 주세요." };
  }
}

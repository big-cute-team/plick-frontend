"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TEAM_IDS } from "@plick/domain/constants";
import type { TeamCode } from "@plick/domain/types";
import { ApiError, apiFetch } from "@plick/core/client";
import { AUTH_COOKIES } from "@/_constants/api";

/**
 * 온보딩 저장 서버 액션 (KAN-320, 모바일 KAN-264 이식) — 닉네임·응원팀을 BE에 한 번에 보낸다.
 * BE는 최초 1회만 허용(재호출 409)하므로, 이미 완료된 세션이면 홈으로 보내 흐름을 끝낸다.
 * `"use server"` 파일이라 승격하지 않고 모바일 `_services/users.ts`와 같은 모양으로
 * 동기화한다(수동 계약).
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
        e.code === "USER_NICKNAME_FORBIDDEN" ||
        e.code === "COMMON_INVALID_PARAM"
      ) {
        // BE 문구가 이미 사용자용 한국어라 그대로 보여주고, 되돌아갈 길만 덧붙인다.
        // COMMON_INVALID_PARAM은 허용 문자 위반(KAN-391) — 클라 선제 검사를 우회해도 잡힌다.
        return { error: `${e.message} 이전 단계에서 닉네임을 바꿔주세요.` };
      }
    }
    console.error("[onboarding] BE 저장 실패:", e);
    return { error: "저장에 실패했어요. 잠시 후 다시 시도해 주세요." };
  }

  redirect("/");
}

/**
 * 프로필 저장 서버 액션 (KAN-319, 모바일 KAN-268·KAN-269 이식) — 프로필 수정 화면의
 * 선택을 `PATCH /api/v1/users/me`로 보낸다. 팀 목록은 전체 교체(빈 배열이면 해제),
 * 닉네임은 항상 실어 보낸다 — BE가 지금과 같은 값은 변경으로 치지 않으므로(7일 기산도
 * 그대로) 입력이 비어 기존 닉네임을 되보내는 경우에도 안전하다.
 * `"use server"` 파일이라 승격하지 않고 모바일 `_services/users.ts`와 같은 모양으로
 * 동기화한다(수동 계약).
 *
 * @param nickname 저장할 닉네임 — 입력이 비었으면 호출부가 기존 닉네임을 넣어 보낸다.
 *   null이면(기존 닉네임조차 없는 경우) 항목 자체를 싣지 않는다.
 * @param teams 화면에서 고른 응원팀 코드 목록 (다중, 빈 배열 허용)
 * @returns 실패 시 화면이 보여줄 에러 메시지. 성공 시 MY로 redirect라 반환하지 않는다.
 */
export async function updateMyProfile(
  nickname: string | null,
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
      body: JSON.stringify({
        ...(nickname !== null && { nickname }),
        teamIds: teams.map((c) => TEAM_IDS[c]),
      }),
    });
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 401) {
        redirect("/login"); // 토큰 만료/무효 — 세션이 끊긴 것이므로 로그인부터
      }
      if (
        e.code === "USER_NICKNAME_COOLDOWN" ||
        e.code === "USER_NICKNAME_DUPLICATED" ||
        e.code === "USER_NICKNAME_FORBIDDEN" ||
        e.code === "COMMON_INVALID_PARAM"
      ) {
        // BE 문구가 이미 사용자용 한국어라 그대로 보여준다(모바일과 같은 방식).
        // COMMON_INVALID_PARAM은 허용 문자 위반(KAN-391) — 클라 선제 검사를 우회해도 잡힌다.
        return { error: e.message };
      }
    }
    console.error("[profile-edit] 프로필 저장 실패:", e);
    return { error: "저장에 실패했어요. 잠시 후 다시 시도해 주세요." };
  }

  redirect("/me");
}

/**
 * 닉네임 중복 확인 (KAN-319, 모바일 KAN-269 이식) — `GET /api/v1/users/nickname-check`.
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
    if (e instanceof ApiError && e.code === "COMMON_INVALID_PARAM") {
      // 허용 문자 위반 400 (KAN-391) — 훅이 선제 검사하지만, 우회하면 BE 문구를 그대로 보여준다
      return { error: e.message };
    }
    console.error("[nickname-check] 확인 실패:", e);
    return { error: "확인에 실패했어요. 잠시 후 다시 시도해 주세요." };
  }
}

/**
 * 회원탈퇴 서버 액션 (KAN-391, 모바일과 같은 계약) — `DELETE /api/v1/users/me`를
 * 부르고 성공하면 토큰 쿠키를 지운 뒤 홈으로 보낸다.
 *
 * 성공 시 토큰 폐기는 필수다. 서버는 무상태 JWT라 이미 발급된 access 토큰을 강제로
 * 무효화할 수 없어서, 쿠키를 남기면 만료(최대 1시간)까지 API 호출이 계속 성공한다.
 * 리프레시 재발급은 서버가 401로 차단하므로 그 이상 연장되지는 않는다.
 *
 * 로그아웃(`auth.ts`)과 달리 BE 호출이 실패하면 쿠키를 지우지 않는다 — 탈퇴가 안 된
 * 계정에서 세션만 끊으면 사용자는 탈퇴가 된 줄 알게 된다. 실패를 값으로 돌려주고
 * 팝업을 열어 둔 채 다시 시도하게 한다.
 *
 * @returns 실패 시 팝업이 보여줄 에러 메시지. 성공 시 redirect라 반환하지 않는다.
 */
export async function deleteAccount(): Promise<{ error: string } | undefined> {
  const jar = await cookies();
  const accessToken = jar.get(AUTH_COOKIES.access)?.value;
  if (!accessToken) {
    redirect("/login");
  }

  try {
    await apiFetch<null>("/api/v1/users/me", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      redirect("/login"); // 토큰 만료/무효 — 세션이 끊긴 것이므로 로그인부터
    }
    console.error("[delete-account] 탈퇴 실패:", e);
    return { error: "탈퇴에 실패했어요. 잠시 후 다시 시도해 주세요." };
  }

  jar.delete(AUTH_COOKIES.access);
  jar.delete(AUTH_COOKIES.refresh);

  redirect("/");
}

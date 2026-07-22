/**
 * @file 내 프로필 조회 fetcher (KAN-267). 서버 렌더 중 access 쿠키를 Bearer로 실어
 * `GET /api/v1/users/me`를 부른다. 렌더 중 읽기만 하고 쿠키를 심지 않으므로
 * 서버 액션(`"use server"`)이 아니다 — `session.ts`와 같은 서버 전용 모듈.
 */

import { cookies } from "next/headers";
import { TEAMS } from "@plick/domain/constants";
import type { TeamCode } from "@plick/domain/types";
import { ApiError, apiFetch } from "@/_apis/client";
import { AUTH_COOKIES } from "@/_constants/api";
import type { MyProfile } from "@/_types/api";

/** BE 응답 shape (이 파일 로컬 — 스웨거 `ProfileResponse` 그대로). 온보딩 전엔 닉네임이,
 * 카카오 가입이면 이메일이 null로 온다. */
interface ProfileResponse {
  userId: number;
  nickname: string | null;
  email: string | null;
  nicknameChangeableAt: string | null;
  teams: ProfileTeamResponse[];
}

/** BE 마이팀 한 건 — `shortName`이 FE `TeamCode`와 같은 값("LIV" 등)이다. */
interface ProfileTeamResponse {
  teamId: number;
  shortName: string;
  nameKo: string;
  logoUrl: string | null;
}

/**
 * BE → 화면 경계 변환. 응원팀은 다중 선택이라 배열 그대로 코드로 좁히고,
 * 빅6 레지스트리에 없는 코드는 버린다(BE가 팀을 늘려도 화면이 깨지지 않게).
 */
function toMyProfile(r: ProfileResponse): MyProfile {
  return {
    nickname: r.nickname,
    email: r.email,
    nicknameChangeableAt: r.nicknameChangeableAt,
    myTeams: r.teams
      .filter((t) => t.shortName in TEAMS)
      .map((t) => t.shortName as TeamCode),
  };
}

/**
 * 내 프로필을 조회한다. 유저별 데이터라 공유 데이터 캐시에 남지 않게 `no-store`로 부른다.
 *
 * @returns 프로필. 비로그인(access 쿠키 없음)이거나 토큰이 무효(401)면 null —
 *   화면이 로그인 유도/리다이렉트로 분기한다.
 * @throws {ApiError} 401 밖의 실패(BE 다운 등) — 라우트 에러 경계가 받는다
 */
export async function getMyProfile(): Promise<MyProfile | null> {
  const jar = await cookies();
  const accessToken = jar.get(AUTH_COOKIES.access)?.value;
  if (!accessToken) {
    return null;
  }

  try {
    const profile = await apiFetch<ProfileResponse>("/api/v1/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    return toMyProfile(profile);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      return null;
    }
    throw e;
  }
}

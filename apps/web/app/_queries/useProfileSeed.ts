"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, apiFetch } from "@plick/core/client";
import type { SessionKind } from "@/_constants/api";
import type { ProfileSeed } from "@/_types/auth";

/** `GET /users/me` 응답 중 provider가 쓰는 조각. 전체 매핑은 `_services/profile.ts`의 `toMyProfile`. */
interface ProfileSeedResponse {
  userId: number;
  nickname: string | null;
  isGuest?: boolean;
}

/**
 * 내 프로필 조각(userId·닉네임·게스트 여부)을 브라우저에서 받는다 (KAN-667, 모바일 KAN-632 이식).
 *
 * 전에는 루트 레이아웃이 서버에서 토큰을 실어 받아 Promise로 내려줬다(KAN-602). 레이아웃이
 * 쿠키를 읽지 않게 되면서 호출 자리가 브라우저로 왔다. 토큰은 HttpOnly라 여기서 실을 수 없지만
 * `/be` 프록시가 쿠키의 access 토큰을 Bearer로 옮겨 싣는다(KAN-318). 401이면 세션이 없거나
 * 끊긴 것이라 null이다. 서버 액션 로그인·로그아웃이 세션 종류를 바꾸면 쿼리 키가 바뀌어
 * 다시 받고, 그 전까지는 직전 값을 들고 있어 닉네임이 깜빡이지 않는다.
 *
 * `isLoading`은 KAN-671에서 붙었다. 조각이 null인 것만으로는 "아직 안 옴"과 "왔는데 닉네임이 없음"을
 * 가를 수 없어, 채팅 닉네임 게이트가 받는 동안에도 그려졌다.
 *
 * @param sessionKind 표식 쿠키로 읽은 세션 종류. null이면 세션이 없어 부르지 않는다
 * @returns `seed`는 프로필 조각(아직 안 왔거나 세션이 없으면 null), `isLoading`은 처음 받는 중인가
 */
export function useProfileSeed(sessionKind: SessionKind | null): {
  seed: ProfileSeed | null;
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery({
    queryKey: ["profile-seed", sessionKind],
    queryFn: async (): Promise<ProfileSeed | null> => {
      try {
        const r = await apiFetch<ProfileSeedResponse>("/api/v1/users/me");
        return {
          userId: r.userId,
          nickname: r.nickname,
          /* 옛 BE(필드 없음)에 붙어도 소셜 사용자로 돌게 false로 떨어뜨린다 */
          isGuest: r.isGuest ?? false,
        };
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    enabled: sessionKind !== null,
    staleTime: Infinity,
    placeholderData: (previous) => previous,
  });
  return { seed: data ?? null, isLoading };
}

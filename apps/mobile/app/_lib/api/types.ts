/**
 * @file 데이터 레이어 타입. 앱 타입(Tab 등)은 `@/_lib/types`,
 * 도메인 타입(FeedPost 등)은 `@plick/domain/types`.
 */

import type { TeamCode } from "@plick/domain/types";

/** 소셜 로그인 프로바이더 — BE `/api/v1/auth/login`의 `provider` 값 */
export type SocialProvider = "KAKAO" | "GOOGLE";

/**
 * 내 프로필 — `GET /users/me`를 화면 소비 형태로 좁힌 것 (KAN-267).
 * 온보딩 전엔 닉네임이, 카카오 가입이면 이메일이 없다. 마이팀은 BE가 배열로 주지만
 * 제품은 단일 팀이라 경계에서 첫 팀 코드로 접는다(`profile.ts`).
 */
export interface MyProfile {
  nickname: string | null;
  email: string | null;
  myTeam: TeamCode | null;
}

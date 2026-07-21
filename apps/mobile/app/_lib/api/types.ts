/**
 * @file 데이터 레이어 타입. 앱 타입(Tab 등)은 `@/_lib/types`,
 * 도메인 타입(FeedPost 등)은 `@plick/domain/types`.
 */

import type { TeamCode } from "@plick/domain/types";

/** 소셜 로그인 프로바이더 — BE `/api/v1/auth/login`의 `provider` 값 */
export type SocialProvider = "KAKAO" | "GOOGLE";

/**
 * 내 프로필 — `GET /users/me`를 화면 소비 형태로 좁힌 것 (KAN-267).
 * 온보딩 전엔 닉네임이, 카카오 가입이면 이메일이 없다. 응원팀은 다중 선택이라
 * 배열 그대로 두고, BE 팀 항목을 팀 코드로만 좁힌다(`profile.ts`).
 */
export interface MyProfile {
  nickname: string | null;
  email: string | null;
  /** 닉네임을 다시 바꿀 수 있는 시각(ISO, KST 오프셋) — null이면 지금 바로 변경 가능.
   * 7일 정책 계산은 BE 몫이고, 화면은 이 값으로 입력 잠금·안내만 한다(KAN-269). */
  nicknameChangeableAt: string | null;
  myTeams: TeamCode[];
}

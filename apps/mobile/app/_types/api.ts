/**
 * @file 데이터 레이어 타입. 앱 타입(Tab 등)은 `@/_types/app`,
 * 도메인 타입(FeedPost·MyProfile 등)은 `@plick/domain/types`.
 */

/** 소셜 로그인 프로바이더 — BE `/api/v1/auth/login`의 `provider` 값 */
export type SocialProvider = "KAKAO" | "GOOGLE";

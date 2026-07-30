/**
 * @file 데이터 레이어 타입. 앱 타입(PostListVariant 등)은 `@/_types/app`,
 * 도메인 타입(ArticleCard 등)은 `@plick/domain/types`.
 * 모바일 `_types/api.ts`와 같은 모양으로 동기화한다(수동 계약, KAN-318).
 */

/** 소셜 로그인 프로바이더 — BE `/api/v1/auth/login`의 `provider` 값 */
export type SocialProvider = "KAKAO" | "GOOGLE";

/**
 * @file 모바일 앱 전용 타입. 도메인 타입(FeedPost·Comment 등)은 `@plick/domain/types`.
 */
import type { ComponentType } from "react";

/** 하단 탭 하나 — 경로·라벨·아이콘·활성 판정 */
export type Tab = {
  href: string;
  label: string;
  Icon: ComponentType<{ size?: number }>;
  match: (p: string) => boolean;
};

/** 소셜 로그인 프로바이더 — BE `/api/v1/auth/login`의 `provider` 값 */
export type SocialProvider = "kakao" | "google";

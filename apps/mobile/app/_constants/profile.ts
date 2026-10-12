/**
 * @file 팀, 선수 프로필 공통 상수 (KAN-604). 한 화면만 쓰는 상수는 `team-profile.ts`, `player-profile.ts`에 둔다.
 */

/** 프로필 개요 탭 관련 이슈 건수 (시안: 최대 5). */
export const PROFILE_ISSUE_COUNT = 5;

/** 프로필 개요 탭 최근 경기 건수. */
export const PROFILE_RECENT_COUNT = 5;

/** 프로필 평점 색 단계(`profileRatingTone`)의 글자색 클래스. */
export const RATING_TONE_CLASS = {
  accent: "text-accent",
  normal: "text-text-2",
  muted: "text-text-4",
} as const;

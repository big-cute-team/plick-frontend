import type { TeamProfileTabKey } from "@/_types/team-profile";

/** 팀 프로필 탭 순서와 라벨 (시안 팀 프로필 탭 줄). 두 프로필 공통 상수는 `profile.ts`에 있다. */
export const TEAM_PROFILE_TABS: { key: TeamProfileTabKey; label: string }[] = [
  { key: "overview", label: "개요" },
  { key: "matches", label: "경기" },
  { key: "squad", label: "선수단" },
  { key: "stats", label: "기록" },
];

/** 시간대별 득실 막대의 최대 높이(px, 시안 92). */
export const MINUTE_BAR_MAX_PX = 92;

/**
 * @file 팀 프로필 화면 상수 (KAN-574). 웹 `_constants/team-profile.ts`와 탭 키가
 * 겹치지만 모바일에만 `info` 탭이 있어 앱별로 둔다(ADR 0011).
 */

import type { TeamProfileTabKey } from "@/_types/team-profile";

/** 팀 프로필 탭 순서. */
export const TEAM_PROFILE_TABS: TeamProfileTabKey[] = [
  "squad",
  "figures",
  "info",
];

/** 팀 프로필 탭 라벨. */
export const TEAM_PROFILE_TAB_LABEL: Record<TeamProfileTabKey, string> = {
  squad: "선수단",
  figures: "기사 속 인물",
  info: "팀 정보",
};

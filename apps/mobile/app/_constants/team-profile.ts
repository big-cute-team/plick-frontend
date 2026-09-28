/**
 * @file 팀 프로필 화면 상수 (KAN-574). 웹은 KAN-576에서 탭이 없어져 모바일에만 있다.
 */

import type { TeamProfileTabKey } from "@/_types/team-profile";

/** 팀 프로필 탭 순서. */
export const TEAM_PROFILE_TABS: TeamProfileTabKey[] = ["squad", "info"];

/** 팀 프로필 탭 라벨. */
export const TEAM_PROFILE_TAB_LABEL: Record<TeamProfileTabKey, string> = {
  squad: "선수단",
  info: "팀 정보",
};

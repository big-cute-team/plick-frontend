/**
 * @file 팀 프로필 화면 상수 (KAN-484). 모바일 `_constants/team-profile.ts`와 같은
 * 값의 수동 동기화 복제다. 화면 표현은 앱별로 둔다(ADR 0011). 선수단 타일 사진
 * 지름은 KAN-567에서 선수단이 표가 되면서 지웠다.
 */

import type { TeamProfileTabKey } from "@/_types/team-profile";

/** 팀 프로필 탭 라벨. */
export const TEAM_PROFILE_TAB_LABEL: Record<TeamProfileTabKey, string> = {
  squad: "선수단",
  figures: "기사 속 인물",
};

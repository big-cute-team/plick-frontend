/**
 * @file 선수 프로필 화면 상수 (KAN-604). 두 프로필 공통 상수는 `profile.ts`에 있다.
 */

import type { PlayerProfileTabKey } from "@/_types/player-profile";

/** 선수 프로필 탭 순서와 라벨 (시안 선수 프로필 탭 줄). */
export const PLAYER_PROFILE_TABS: {
  key: PlayerProfileTabKey;
  label: string;
}[] = [
  { key: "overview", label: "개요" },
  { key: "stats", label: "기록" },
  { key: "matches", label: "경기" },
];

/** 개요 탭 "같은 팀 선수" 인원 (웹 레일과 같은 8명). */
export const TEAMMATE_COUNT = 8;

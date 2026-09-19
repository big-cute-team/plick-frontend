/**
 * @file 팀 프로필 화면 상수 (KAN-484). 모바일 `_constants/team-profile.ts`와 같은
 * 값의 수동 동기화 복제다 — 화면 표현은 앱별로 둔다(ADR 0011).
 */

import type { TeamProfileTabKey } from "@/_types/team-profile";

/**
 * 선수단 타일 안 사진 지름(px). 모바일과 같은 값이다 — 데스크톱에서 얼굴을 더
 * 키우면 한 포지션이 화면을 넘어 스크롤이 다시 길어진다.
 */
export const SQUAD_TILE_PHOTO = 72;

/** 팀 프로필 탭 라벨. */
export const TEAM_PROFILE_TAB_LABEL: Record<TeamProfileTabKey, string> = {
  squad: "선수단",
  figures: "기사 속 인물",
};

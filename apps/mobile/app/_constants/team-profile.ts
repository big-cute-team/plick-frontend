/**
 * @file 팀 프로필 화면 상수 (KAN-484).
 */

import type { TeamProfileTabKey } from "@/_types/team-profile";

/**
 * 선수단 타일 안 사진 지름(px).
 *
 * 3열 그리드에서 타일 안쪽은 320px 화면 기준 74px쯤 남는다. 72px면 좌우가 딱
 * 맞고, 그보다 키우면 제일 좁은 기기에서 사진이 타일을 넘는다.
 */
export const SQUAD_TILE_PHOTO = 72;

/** 팀 프로필 탭 라벨. 인물 사전 쪽은 무슨 목록인지 제목만으로 알게 길게 쓴다. */
export const TEAM_PROFILE_TAB_LABEL: Record<TeamProfileTabKey, string> = {
  squad: "선수단",
  figures: "기사 속 인물",
};

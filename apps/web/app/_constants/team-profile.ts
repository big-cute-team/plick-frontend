import type {
  PlayerProfileTabKey,
  TeamProfileTabKey,
} from "@/_types/team-profile";

/** 팀 프로필 탭 순서와 라벨 (시안 팀 프로필 탭 줄). */
export const TEAM_PROFILE_TABS: { key: TeamProfileTabKey; label: string }[] = [
  { key: "overview", label: "개요" },
  { key: "matches", label: "경기" },
  { key: "squad", label: "선수단" },
  { key: "stats", label: "기록" },
];

/** 프로필 개요 탭 관련 이슈 건수 (시안: 앞 6건). 팀, 선수 프로필 공통. */
export const PROFILE_ISSUE_COUNT = 6;

/** 프로필 개요 탭 최근 경기 건수. 팀, 선수 프로필 공통. */
export const PROFILE_RECENT_COUNT = 5;

/** 시간대별 득실 막대의 최대 높이(px, 시안 92). */
export const MINUTE_BAR_MAX_PX = 92;

/** 선수 프로필 탭 순서와 라벨 (시안 선수 프로필 탭 줄). */
export const PLAYER_PROFILE_TABS: {
  key: PlayerProfileTabKey;
  label: string;
}[] = [
  { key: "overview", label: "개요" },
  { key: "stats", label: "기록" },
  { key: "matches", label: "경기" },
];

/** 선수 프로필 레일 "같은 팀 선수" 인원 (시안 8명). */
export const TEAMMATE_COUNT = 8;

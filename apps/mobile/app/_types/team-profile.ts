/**
 * @file 팀 프로필 화면 전용 타입 (KAN-574 → KAN-604). 도메인 타입은 `@plick/domain/team-profile`이다.
 */

/** 팀 프로필 본문 탭. URL에 올리지 않아 프로필을 열 때마다 개요로 돌아간다. */
export type TeamProfileTabKey = "overview" | "matches" | "squad" | "stats";

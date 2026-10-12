/**
 * @file 선수 프로필 화면 전용 타입 (KAN-604). 도메인 타입은 `@plick/domain/player-profile`이다.
 */

/** 선수 프로필 본문 탭. 팀 프로필과 같이 URL에 올리지 않아 열 때마다 개요로 돌아간다. */
export type PlayerProfileTabKey = "overview" | "stats" | "matches";

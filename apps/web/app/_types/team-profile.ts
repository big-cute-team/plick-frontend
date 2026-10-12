/**
 * @file 팀 프로필 화면 전용 타입 (KAN-599). 도메인 타입은 `@plick/domain/team-profile`이고
 * 여기는 데스크톱 화면 구성에만 쓰는 것을 둔다.
 */

/**
 * 팀 프로필 본문 탭. URL로 올리지 않고 컴포넌트 상태로 둬서 프로필을 열 때마다 개요로
 * 돌아간다(시안 "탭은 프로필을 열 때마다 개요로 초기화").
 */
export type TeamProfileTabKey = "overview" | "matches" | "squad" | "stats";

/** 선수 프로필 본문 탭. 팀 프로필과 같이 열 때마다 개요로 돌아간다. */
export type PlayerProfileTabKey = "overview" | "stats" | "matches";

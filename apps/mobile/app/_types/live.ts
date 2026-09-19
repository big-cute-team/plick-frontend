/**
 * @file 라이브 스코어 화면 전용 타입 (KAN-458). 도메인 타입은 `@plick/domain/live`고
 * 여기는 모바일 화면 구성에만 쓰는 것을 둔다.
 */

/**
 * 경기 상세 안의 탭. 상태별로 보이는 조합이 다르다(`MATCH_TABS_BY_STATUS`).
 * URL로 승격하지 않고 컴포넌트 상태로 둔다(ADR 0126 스토리 2).
 */
export type MatchTabKey = "preview" | "summary" | "lineups" | "stats" | "chat";

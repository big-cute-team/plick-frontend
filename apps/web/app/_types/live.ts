/**
 * @file 라이브 스코어 화면 전용 타입 (KAN-458). 도메인 타입은 `@plick/domain/live`고
 * 여기는 데스크톱 화면 구성에만 쓰는 것을 둔다.
 */

/**
 * 경기 상세 좌측 본문의 탭 (KAN-462). 모바일과 같은 요약·라인업·스탯(예정은
 * 프리뷰) 구성이고, 채팅은 탭이 아니라 우측 패널에 늘 떠 있어 여기 없다.
 * URL로 승격하지 않고 컴포넌트 상태로 둔다.
 */
export type MatchTabKey = "preview" | "summary" | "lineups" | "stats";

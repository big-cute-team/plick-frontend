/**
 * @file 투표 화면 전용 타입.
 */

/** 토론 목록을 가르는 탭. 진행 중은 열린 토론, 마감은 contentType FINISH이거나 마감 시각이 지난 토론. */
export type DebateListTab = "open" | "closed";

/** 투표 화면의 탭. 목록 두 탭에 승부예측 시즌 랭킹(KAN-701)이 더해진다. URL `?tab=`의 값이다. */
export type DebateTab = DebateListTab | "rank";

/**
 * @file 투표 화면 전용 타입.
 */

/** 투표 탭. 진행 중은 열린 토론, 마감은 contentType FINISH이거나 마감 시각이 지난 토론. */
export type DebateTab = "open" | "closed";

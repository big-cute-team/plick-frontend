/**
 * @file 투표 화면 전용 타입 (KAN-567).
 */

/** 토론 목록을 가르는 탭. 진행 중과 마감은 같은 리스트를 갈라 보여준다. */
export type DebateListTab = "open" | "closed";

/** 투표 화면의 탭. URL `?tab=`의 값이다. 목록 두 탭에 승부예측 시즌 랭킹(KAN-701)이 더해진다. */
export type DebateTab = DebateListTab | "rank";

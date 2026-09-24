/**
 * @file 팀 프로필 화면 전용 타입 (KAN-484).
 */

/**
 * 팀 프로필 본문 탭. `squad`는 API-Football 이번 시즌 등록 명단이고 `figures`는
 * 해축이모가 기사에서 뽑아 쌓은 인물 사전이다 — 출처가 달라 한 목록으로 합칠 수
 * 없다(ADR 0151).
 */
export type TeamProfileTabKey = "squad" | "figures";

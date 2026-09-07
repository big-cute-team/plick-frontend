/**
 * @file 라이브 스코어 쿼리키 (KAN-452). 도메인 → 스코프 → 파라미터 순 계층화는
 * `articleKeys.ts`와 같은 규약이다. web·mobile이 처음부터 함께 쓰는 기능이라
 * 앱 폴더를 거치지 않고 바로 여기 둔다(ADR 0011 게이트 C).
 */

export const liveKeys = {
  all: ["live"] as const,
  /** 날짜별 경기 목록 — 날짜가 바뀌면 키가 바뀌어 각자 캐시된다. */
  matches: (date: string) => ["live", "matches", date] as const,
  /** 경기 상세 — 라이브면 폴링 대상. */
  match: (matchId: number) => ["live", "match", matchId] as const,
  /** 선수 경기 스탯 — 시트가 열릴 때만 받는다. */
  playerMatchStats: (matchId: number, playerId: number) =>
    ["live", "match", matchId, "player", playerId] as const,
  /** 선수 시즌 스탯 — 시트가 열릴 때만 받는다. */
  playerSeasonStats: (playerId: number) =>
    ["live", "player", playerId, "season"] as const,
};

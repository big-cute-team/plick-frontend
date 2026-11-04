/**
 * @file AI 경기 브리핑 쿼리키 (KAN-724). 경기 id를 문자열로 박아 경기를 옮기면 키가 갈린다. 이전
 * 경기의 캐시가 새 경기에 보일 일이 없고, 늦게 도착한 이전 응답도 제 키에만 들어간다.
 */

export const matchBriefingKeys = {
  all: ["match-briefing"] as const,
  /** 경기 하나의 브리핑. 티켓 규약 `["match-briefing", String(matchId)]`. */
  match: (matchId: number) => ["match-briefing", String(matchId)] as const,
};

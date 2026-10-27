/**
 * @file 토론 쿼리키 (KAN-418). 도메인 → 스코프 순 계층화는 `articleKeys.ts`와
 * 같은 규약이다. web·mobile이 처음부터 함께 쓰는 기능이라 앱 폴더를 거치지 않고
 * 바로 여기 둔다(ADR 0011 게이트 C).
 */

export const debateKeys = {
  all: ["debates"] as const,
  /** 토론 리스트 — BE에 필터·페이지네이션이 없어 파라미터 없는 단일 키다. */
  list: () => ["debates", "list"] as const,
  /** 기사별 토론 전체 — `syncDebateVote`가 한 번에 훑는 상위 키 (KAN-681). */
  articles: ["debates", "article"] as const,
  /**
   * 기사 하나에 붙은 토론 (KAN-681) — 기사 상세가 익명 ISR 씨앗 위에 브라우저에서
   * 집계를 다시 받을 때 쓴다. 같은 토론이 리스트·릴스 피드 캐시에도 살아 있어 투표
   * 집계는 `syncDebateVote`가 셋을 함께 맞춘다.
   */
  byArticle: (articleId: string) => ["debates", "article", articleId] as const,
};

/**
 * @file 토론 쿼리키 (KAN-418). 도메인 → 스코프 순 계층화는 `articleKeys.ts`와
 * 같은 규약이다. web·mobile이 처음부터 함께 쓰는 기능이라 앱 폴더를 거치지 않고
 * 바로 여기 둔다(ADR 0011 게이트 C).
 */

export const debateKeys = {
  all: ["debates"] as const,
  /** 토론 리스트 — BE에 필터·페이지네이션이 없어 파라미터 없는 단일 키다. */
  list: () => ["debates", "list"] as const,
  /** 기사별 토론 — 릴 세부가 마감(FINISH) 릴의 결과를 클라에서 받을 때 쓴다. */
  article: (articleId: string) => ["debates", "article", articleId] as const,
};

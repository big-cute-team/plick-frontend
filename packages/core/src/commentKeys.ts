/**
 * @file 댓글 쿼리키 (KAN-303). 도메인 → 스코프 → 파라미터 순으로 계층화해서
 * 상위 키로 하위를 한 번에 무효화할 수 있게 둔다. 모바일 `_queries/commentKeys.ts`로
 * 살다 web이 두 번째 사용처가 되면서 승격했다(KAN-329) — `articleKeys`와 같은
 * 이유로, 키 문자열이 앱마다 갈리면 무효화 규약이 조용히 어긋난다.
 */

export const commentKeys = {
  all: ["comments"] as const,
  /** 기사(릴) 하나의 댓글 목록 — 릴스와 기사 세부가 같은 id로 같은 캐시를 본다. */
  list: (articleId: string) => ["comments", "list", articleId] as const,
};

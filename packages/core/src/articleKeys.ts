/**
 * @file 기사 쿼리키 (KAN-271). 도메인 → 스코프 → 파라미터 순으로 계층화해서
 * 상위 키로 하위를 한 번에 무효화할 수 있게 둔다. 모바일 `_queries/articleKeys.ts`로
 * 살다 web이 두 번째 사용처가 되면서 승격했다(KAN-321) — 키 문자열이 앱마다
 * 갈리면 무효화 규약이 조용히 어긋난다.
 */

import type { Filter } from "@plick/domain/types";

export const articleKeys = {
  all: ["articles"] as const,
  /** 팀 필터별 피드 — 탭을 바꾸면 키가 바뀌어 페이지가 각자 캐시된다. */
  feed: (team: Filter) => ["articles", "feed", team] as const,
};

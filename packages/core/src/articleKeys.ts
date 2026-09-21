/**
 * @file 기사 쿼리키 (KAN-271). 도메인 → 스코프 → 파라미터 순으로 계층화해서
 * 상위 키로 하위를 한 번에 무효화할 수 있게 둔다. 모바일 `_queries/articleKeys.ts`로
 * 살다 web이 두 번째 사용처가 되면서 승격했다(KAN-321) — 키 문자열이 앱마다
 * 갈리면 무효화 규약이 조용히 어긋난다.
 */

import type { Filter, TeamCode } from "@plick/domain/types";

export const articleKeys = {
  all: ["articles"] as const,
  /** 팀 필터별 피드 — 탭을 바꾸면 키가 바뀌어 페이지가 각자 캐시된다. */
  feed: (team: Filter) => ["articles", "feed", team] as const,
  /** 기사 상세 — 릴 세부가 기자 목록을 클라에서 받을 때 쓴다(KAN-365). */
  detail: (articleId: string) => ["articles", "detail", articleId] as const,
  /**
   * 인물 관련 기사 (KAN-500) — 인물 프로필 아래 무한 목록. 팀 피드와 스코프를
   * 갈라 두어 `feed` 상위 키 무효화에 딸려 가지 않고 인물별로 따로 캐시된다.
   */
  figureFeed: (figureId: string) => ["articles", "figure", figureId] as const,
  /** 이슈 기사 (KAN-523) — 이슈 상세의 무한 목록. 인물 기사와 같은 이유로 스코프를 가른다. */
  storyFeed: (storyId: string) => ["articles", "story", storyId] as const,
  /**
   * 경기 뉴스 (KAN-484) — 경기 상세 뉴스 탭이 양 팀 기사를 합쳐 보여준다. 팀이
   * 둘인 한 목록이라 팀 피드 키를 재사용할 수 없고, 순서가 뒤집혀도 같은 캐시를
   * 쓰게 코드를 정렬해 키에 담는다.
   */
  matchNews: (teams: TeamCode[]) =>
    ["articles", "match-news", [...teams].sort().join("-")] as const,
};

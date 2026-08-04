/**
 * @file 기사 surface의 팀 필터 URL 헬퍼 (KAN-350). 홈 surface 몫(teamHubPath 등)은
 * 모바일과 공용이라 `@plick/domain/format`에 있고, 기사 페이지는 web 전용
 * 라우트라 여기 둔다.
 */
import { TEAMS, TEAM_FULL_NAMES } from "@plick/domain/constants";
import { teamFilterFromPathname } from "@plick/domain/format";
import type { Filter } from "@plick/domain/types";

/**
 * 기사 surface의 팀 필터 → URL. 전체는 `/articles`, 팀은
 * `/articles/teams/[slug]`다. 홈의 팀 허브(`/teams/[slug]`)와 별개 URL인 이유:
 * 기사 페이지에서 고른 팀을 팀 허브 URL로 바꾸면 새로고침 시 홈 화면으로
 * 건너뛰어 버린다 — 새로고침해도 기사 surface에 남아야 한다.
 */
export function articlesTeamPath(filter: Filter): string {
  return filter === "ALL"
    ? "/articles"
    : `/articles/teams/${TEAMS[filter].slug}`;
}

/**
 * 경로 → 기사 surface 팀 필터 역산. `/articles/teams/[slug]`면 그 팀,
 * `/articles`(및 그 외)는 전체다. `/articles` 접두를 벗기고 홈 surface 파서를
 * 재사용한다 — slug 판정 규칙이 한 곳(도메인)에 남는다.
 */
export function articlesTeamFilterFromPathname(pathname: string): Filter {
  if (!pathname.startsWith("/articles")) return "ALL";
  return teamFilterFromPathname(pathname.slice("/articles".length) || "/");
}

/**
 * 기사 surface의 문서 제목. 탭 전환이 `history.replaceState`라 서버 메타데이터가
 * 다시 렌더되지 않으므로 클라가 `document.title`을 이걸로 직접 맞춘다.
 * `/articles`·`/articles/teams/[slug]`의 metadata title(+ "%s | PLick" 템플릿)과
 * 같은 문자열이어야 한다.
 */
export function articlesTeamTitle(filter: Filter): string {
  return filter === "ALL"
    ? "기사 | PLick"
    : `${TEAM_FULL_NAMES[filter]} 기사 | PLick`;
}

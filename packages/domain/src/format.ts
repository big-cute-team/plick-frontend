/**
 * @file 공용 포맷 유틸 — 수치 축약·아바타 이니셜. 두 앱에 동일 구현으로 복제돼
 * 있던 것을 구조 감사(2026-07-16)로 승격했다(ADR 0018).
 */
import { TEAMS, TEAM_BY_SLUG, TEAM_FULL_NAMES } from "./constants";
import type { Filter } from "./types";

/**
 * 팀 필터 → 그 필터의 대표 URL 경로 (KAN-350). 전체는 홈(`/`), 팀은 팀 허브
 * (`/teams/[slug]`)다. 두 앱의 필터 탭 href·history 갱신이 같은 규약을 쓴다.
 *
 * @example
 * teamHubPath("TOT"); // "/teams/tottenham"
 * teamHubPath("ALL"); // "/"
 */
export function teamHubPath(filter: Filter): string {
  return filter === "ALL" ? "/" : `/teams/${TEAMS[filter].slug}`;
}

/**
 * 경로 → 팀 필터 역산 (KAN-350). `/teams/[slug]`면 그 팀, 그 외는 전체다.
 * 팀 허브가 홈 화면을 그대로 렌더하므로, 피드가 URL 하나로 어느 탭인지
 * 판단할 때 쓴다. 모르는 slug는 전체로 떨어뜨린다 — 라우트 쪽 검증
 * (`notFound()`)은 페이지가 따로 한다.
 *
 * @example
 * teamFilterFromPathname("/teams/tottenham"); // "TOT"
 * teamFilterFromPathname("/"); // "ALL"
 */
export function teamFilterFromPathname(pathname: string): Filter {
  const slug = pathname.match(/^\/teams\/([^/]+)\/?$/)?.[1];
  return (slug && TEAM_BY_SLUG[slug]) || "ALL";
}

/**
 * 팀 허브(홈 surface)의 문서 제목 (KAN-350). 탭 전환이 `history.replaceState`라
 * 서버 메타데이터가 다시 렌더되지 않으므로, 클라가 `document.title`을 이걸로
 * 직접 맞춘다. 팀 허브 `generateMetadata`의 title(+ "%s | PLick" 템플릿)과 같은
 * 문자열이어야 직접 진입과 탭 전환의 제목이 어긋나지 않는다.
 */
export function teamHubTitle(filter: Filter): string {
  return filter === "ALL"
    ? "PLick"
    : `${TEAM_FULL_NAMES[filter]} 이적 루머 | PLick`;
}

/**
 * 기사 surface의 팀 필터 → URL (KAN-350). 전체는 `/articles`, 팀은
 * `/articles/teams/[slug]`다. 홈의 팀 허브(`/teams/[slug]`)와 별개 URL인 이유:
 * 기사 페이지에서 고른 팀을 팀 허브 URL로 바꾸면 새로고침 시 홈 화면으로
 * 건너뛰어 버린다 — 새로고침해도 기사 surface에 남아야 한다.
 * web 전용이던 것을 모바일 기사 페이지 신설(KAN-386)에서 승격했다.
 */
export function articlesTeamPath(filter: Filter): string {
  return filter === "ALL"
    ? "/articles"
    : `/articles/teams/${TEAMS[filter].slug}`;
}

/**
 * 경로 → 기사 surface 팀 필터 역산. `/articles/teams/[slug]`면 그 팀,
 * `/articles`(및 그 외)는 전체다. `/articles` 접두를 벗기고 홈 surface 파서를
 * 재사용한다 — slug 판정 규칙이 한 곳에 남는다.
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

/**
 * 수치를 축약 표기로 포맷한다.
 *
 * @example
 * formatCount(12400); // "12.4K"
 * formatCount(940); // "940"
 */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  const k = n / 1000;
  return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`;
}

/**
 * 핸들에서 아바타 이니셜 2글자를 뽑는다.
 *
 * @example
 * avatarInitials("@kop_anfield"); // "KO"
 */
export function avatarInitials(handle: string): string {
  return handle.replace("@", "").slice(0, 2).toUpperCase();
}

/**
 * 닉네임 변경 가능 시각 안내 문구용 포맷 — "7월 28일 14:38".
 * BE가 KST 오프셋의 ISO 문자열을 주지만, 사용자의 기기 시간대와 무관하게
 * 항상 KST로 보여주도록 타임존을 고정한다. 모바일 `_utils/me.ts`에 있던 것을
 * web 이식(KAN-319)에서 승격했다.
 *
 * @param iso `nicknameChangeableAt` ISO 문자열 (예: "2026-07-28T14:38:45+09:00")
 */
export function formatChangeableAt(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/**
 * 메타 description용 말줄임 — max 글자를 넘으면 잘라 "…"를 붙인다 (KAN-346).
 * 검색 스니펫 권장 길이(160자)에 맞춰 기사 요약을 자를 때 두 앱의
 * `generateMetadata`가 쓴다.
 *
 * @example
 * truncateText("아주 긴 요약…", 160);
 */
export function truncateText(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * ISO 시각을 상대 표기("2분 전")로 바꾼다. 하루를 넘기면 날짜로 떨어뜨린다 (KAN-271).
 *
 * BE 값에 이미 KST 오프셋(+09:00)이 박혀 있으므로 추가 타임존 보정을 넣으면
 * 9시간이 밀린다. `Date`가 오프셋을 그대로 해석하게 두고 차이만 계산한다.
 * 모바일 `_utils/time.ts`에 있던 것을 web 이식(KAN-321)에서 승격했다.
 *
 * @param iso 발행 시각 (예: `2026-07-21T13:27:32.255079+09:00`)
 * @param now 비교 기준 시각. 테스트에서 고정값을 넣으려고 열어 둔다.
 * @example
 * formatRelativeTime("2026-07-21T13:27:32+09:00"); // "2분 전"
 */
export function formatRelativeTime(
  iso: string,
  now: Date = new Date(),
): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";

  const diff = now.getTime() - at.getTime();
  if (diff < MINUTE) return "방금";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}분 전`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}시간 전`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}일 전`;

  return `${at.getMonth() + 1}월 ${at.getDate()}일`;
}

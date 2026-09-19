/**
 * @file 데스크톱 웹과 모바일 웹 사이를 오갈 때 쓰는 경로 규칙 (KAN-379).
 *
 * 두 앱은 도메인이 갈려 있고(`plick.co.kr` / `m.plick.co.kr`) 라우트가 대부분
 * 짝을 이루지만 전부는 아니다. 전환 배너가 지금 보던 화면으로 건너뛰게 하되,
 * 상대 앱에 없는 경로면 홈으로 보낸다 — 링크 하나 때문에 404를 띄우지 않는다.
 *
 * 두 앱이 같은 규칙을 써야 해서(한쪽만 고치면 조용히 어긋난다) 도메인에 둔다.
 */

/**
 * 양쪽 앱에 같은 모양으로 있는 경로인지.
 *
 * 짝이 있는 건 홈(`/`), 팀 허브(`/teams/[slug]`), 릴스(`/reels`), 기사 상세
 * (`/articles/[id]`)다. 기사 목록(`/articles`)과 그 팀별 경로는 데스크톱 전용이라
 * 제외한다 — 모바일엔 그 라우트가 없다. 로그인·온보딩처럼 세션 흐름 한복판인
 * 경로도 건너뛰게 두면 어색해서 홈으로 보낸다.
 */
function isSharedPath(pathname: string): boolean {
  if (pathname === "/" || pathname === "/reels") return true;
  if (/^\/teams\/[^/]+$/.test(pathname)) return true;
  return /^\/articles\/\d+$/.test(pathname);
}

/**
 * 상대 앱에서 열 URL을 만든다.
 *
 * @param siteUrl 상대 앱의 대표 URL (`WEB_SITE_URL` 또는 `MOBILE_SITE_URL`)
 * @param pathname 지금 보고 있는 경로
 * @returns 짝이 있는 화면이면 같은 경로, 아니면 상대 앱 홈
 */
export function crossSiteUrl(siteUrl: string, pathname: string): string {
  return isSharedPath(pathname) ? `${siteUrl}${pathname}` : siteUrl;
}

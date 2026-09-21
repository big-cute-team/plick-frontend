/**
 * @file 데스크톱 웹과 모바일 웹 사이를 오갈 때 쓰는 경로 규칙 (KAN-379).
 *
 * 두 앱은 도메인이 갈려 있고(`plick.co.kr` / `m.plick.co.kr`) 라우트가 대부분
 * 짝을 이루지만 전부는 아니다. 전환 배너가 지금 보던 화면으로 건너뛰게 하되,
 * 상대 앱에 없는 경로면 홈으로 보낸다 — 링크 하나 때문에 404를 띄우지 않는다.
 *
 * 두 앱이 같은 규칙을 써야 해서(한쪽만 고치면 조용히 어긋난다) 도메인에 둔다.
 *
 * 기기 식별자 전달(KAN-542)도 같은 이유로 여기다. 쿠키는 도메인별이라 배너를 타면
 * 한 사람이 두 기기로 세어진다. 보내는 쪽이 링크에 쿼리로 싣고, 받는 쪽 프록시가
 * 자기 쿠키가 없을 때만 그 값을 채택한다. 파라미터 이름이 갈리면 조용히 두 명이 된다.
 */

/**
 * 전환 배너 링크에 기기 식별자를 싣는 쿼리 파라미터 (KAN-542). 보내는 배너와 받는
 * 프록시가 같은 이름을 봐야 한다. 쿠키 `plick_did`의 짝이다.
 */
export const DEVICE_ID_QUERY_PARAM = "did";

/**
 * 양쪽 앱에 같은 모양으로 있는 경로인지.
 *
 * 짝이 있는 건 홈(`/`), 팀 허브(`/teams/[slug]`), 릴스(`/reels`), 기사 상세
 * (`/articles/[id]`), 인물 프로필(`/figures/[id]`)이다. 인물 프로필은 모바일에만
 * 있다가 웹에 생기면서(KAN-501) 짝이 됐다. 기사 목록(`/articles`)과 그 팀별
 * 경로는 데스크톱 전용이라 제외한다 — 모바일엔 그 라우트가 없다. 로그인·온보딩처럼
 * 세션 흐름 한복판인 경로도 건너뛰게 두면 어색해서 홈으로 보낸다.
 */
function isSharedPath(pathname: string): boolean {
  if (pathname === "/" || pathname === "/reels") return true;
  if (/^\/teams\/[^/]+$/.test(pathname)) return true;
  if (/^\/figures\/\d+$/.test(pathname)) return true;
  return /^\/articles\/\d+$/.test(pathname);
}

/**
 * 상대 앱에서 열 URL을 만든다.
 *
 * @param siteUrl 상대 앱의 대표 URL (`WEB_SITE_URL` 또는 `MOBILE_SITE_URL`)
 * @param pathname 지금 보고 있는 경로
 * @param deviceId 이 브라우저의 기기 식별자(쿠키 `plick_did`). 있으면 쿼리로 실어
 *   상대 도메인에서도 같은 기기로 이어지게 한다(KAN-542). 아직 없으면 생략
 * @returns 짝이 있는 화면이면 같은 경로, 아니면 상대 앱 홈
 * @example crossSiteUrl("https://plick.co.kr", "/reels", "3f1c…") → "https://plick.co.kr/reels?did=3f1c…"
 */
export function crossSiteUrl(
  siteUrl: string,
  pathname: string,
  deviceId?: string | null,
): string {
  const url = isSharedPath(pathname) ? `${siteUrl}${pathname}` : siteUrl;
  if (!deviceId) return url;
  return `${url}?${DEVICE_ID_QUERY_PARAM}=${encodeURIComponent(deviceId)}`;
}

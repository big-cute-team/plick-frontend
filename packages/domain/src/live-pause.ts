/**
 * @file 라이브 스코어 일시 중단 깃발 (KAN-644).
 *
 * BE 축구 데이터 상류가 죽으면(`MATCH_UPSTREAM_ERROR` 502) 경기 목록, 경기 상세, 순위,
 * 팀·선수 프로필이 빈 화면이나 에러로 뜬다. 복구 전까지 두 앱의 `proxy.ts`가 이 경로들을
 * 준비중 화면(`LIVE_PAUSED_PATH`)으로 rewrite하고, 다른 화면에 끼는 오늘 경기 띠는 조회를
 * 건너뛴다. 복구되면 `LIVE_SCORE_PAUSED`만 false로 돌린다.
 *
 * 프록시(edge 번들)가 읽으므로 다른 모듈을 import하지 않는다.
 */

/** 라이브 스코어 화면을 닫아 두는지. */
export const LIVE_SCORE_PAUSED: boolean = true;

/** 준비중 화면 라우트. 프록시가 닫힌 경로를 이리로 rewrite해 주소는 그대로 남는다. */
export const LIVE_PAUSED_PATH = "/live-paused";

/**
 * 라이브 스코어 API에 기대는 화면 경로. `/live` 목록, `/live/matches/*`, `/live/standings`,
 * `/players/*`, `/teams/*\/profile`이다. `/live/chat`은 채팅 API라 열어 둔다.
 */
const LIVE_SCORE_PATH =
  /^\/(?:live(?:\/matches\/[^/]+|\/standings)?|players\/[^/]+|teams\/[^/]+\/profile)\/?$/;

/**
 * 이 경로가 라이브 스코어 API에 기대는 화면인지.
 *
 * @param pathname 요청 경로(쿼리 제외)
 * @example
 * isLiveScorePath("/live"); // true
 * isLiveScorePath("/live/chat"); // false
 */
export function isLiveScorePath(pathname: string): boolean {
  return LIVE_SCORE_PATH.test(pathname);
}

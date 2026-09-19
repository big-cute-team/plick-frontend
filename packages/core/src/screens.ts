/**
 * @file 라우트 경로를 `screen_viewed`의 화면 값으로 옮기는 표 (KAN-543).
 *
 * 값 목록은 BE 계약(`ClientEventIntakeService`)의 허용 목록 열아홉이고 라우트를 그대로
 * 옮긴 것이다. 두 앱의 라우트가 거의 같아(이슈 상세는 데스크톱만) 표를 하나로 둔다.
 * 모르는 경로는 null이라 보내지 않는다 - 서버가 버리는 건을 실어 보낼 이유가 없다.
 *
 * 화면 안 탭(`match_detail.lineups`)은 여기서 내지 않는다. 라우트로는 모르는 값이라
 * 탭 컴포넌트가 직접 붙인다.
 */

/** `screen_viewed`의 `screen` 값. BE 허용 목록과 같다. */
export type ScreenName =
  | "home"
  | "team_hub"
  | "articles"
  | "article_detail"
  | "reels"
  | "debates"
  | "live"
  | "live_standings"
  | "match_detail"
  | "team_profile"
  | "figure"
  | "story"
  | "me"
  | "me_activity"
  | "me_edit"
  | "me_blocked"
  | "login"
  | "signup"
  | "docs";

/** 경로가 가리키는 화면과 그 화면의 주인공 id. */
export interface ResolvedScreen {
  screen: ScreenName;
  /** 기사 id, 팀 slug, 인물 id, 경기 id, 이슈 id. 주인공이 없는 화면은 생략 */
  ref?: string;
}

/** 고정 경로 → 화면. 동적 세그먼트가 없는 것들. */
const STATIC_SCREENS: Record<string, ScreenName> = {
  "/": "home",
  "/articles": "articles",
  "/reels": "reels",
  "/debates": "debates",
  "/live": "live",
  "/live/standings": "live_standings",
  "/me": "me",
  "/me/activity": "me_activity",
  "/me/edit": "me_edit",
  "/me/blocked": "me_blocked",
  "/login": "login",
  "/signup": "signup",
  "/faq": "docs",
  "/privacy": "docs",
  "/terms": "docs",
};

/**
 * 동적 경로 패턴. 앞에서부터 처음 맞는 것을 쓴다. 릴스는 `/reels/{id}`도 `reels`로 접고
 * ref를 싣지 않는다 - 릴을 넘길 때마다 URL이 바뀌는데(`useReelUrlSync`) 그때마다 화면
 * 전환으로 세면 릴 한 장이 화면 하나가 되고, 어느 릴을 봤는지는 조회 기록(`article_opened`)이
 * 이미 남긴다.
 */
const DYNAMIC_SCREENS: { pattern: RegExp; screen: ScreenName; ref: boolean }[] =
  [
    {
      pattern: /^\/teams\/([^/]+)\/profile$/,
      screen: "team_profile",
      ref: true,
    },
    { pattern: /^\/teams\/([^/]+)$/, screen: "team_hub", ref: true },
    { pattern: /^\/articles\/teams\/([^/]+)$/, screen: "articles", ref: true },
    { pattern: /^\/articles\/([^/]+)$/, screen: "article_detail", ref: true },
    { pattern: /^\/reels\/([^/]+)$/, screen: "reels", ref: false },
    {
      pattern: /^\/live\/matches\/([^/]+)$/,
      screen: "match_detail",
      ref: true,
    },
    { pattern: /^\/figures\/([^/]+)$/, screen: "figure", ref: true },
    { pattern: /^\/stories\/([^/]+)$/, screen: "story", ref: true },
  ];

/** `ref` 허용 형식(BE 규칙). 영문, 숫자, `_ . : -`만 64자 이하. */
const REF_PATTERN = /^[A-Za-z0-9_.:-]{1,64}$/;

/**
 * 경로를 화면 값으로 옮긴다. 쿼리와 해시는 호출부가 뗀 pathname을 넘긴다.
 *
 * @param pathname `usePathname()`이 주는 경로 (`/live/matches/1208384`)
 * @returns 화면과 ref. 목록에 없는 경로는 null
 * @example resolveScreen("/teams/arsenal") // { screen: "team_hub", ref: "arsenal" }
 */
export function resolveScreen(pathname: string): ResolvedScreen | null {
  const path =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;
  const fixed = STATIC_SCREENS[path];
  if (fixed) return { screen: fixed };
  for (const { pattern, screen, ref } of DYNAMIC_SCREENS) {
    const match = path.match(pattern);
    if (!match) continue;
    if (!ref) return { screen };
    const value = decodeURIComponent(match[1] ?? "");
    return REF_PATTERN.test(value) ? { screen, ref: value } : { screen };
  }
  return null;
}

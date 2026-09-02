/**
 * @file 웹 앱 전용 상수. 도메인 상수(TEAMS 등)는 `@plick/domain/constants`.
 */

import type { PostListVariant } from "@/_types/app";

/**
 * 온보딩 진입 경로. 온보딩 흐름을 내려서(`app/_onboarding` private 폴더) 지금은
 * 라우팅되지 않는 주소다 — 잠들어 있는 온보딩 코드만 참조한다. 되살릴 때 폴더를
 * `app/onboarding`으로 되돌리고 로그인(`_services/auth.ts`)의 분기를 복원한다.
 */
export const ONBOARDING_ENTRY = "/onboarding/nickname";

/** 팀이 태그되지 않은 기사의 썸네일 배경에 쓰는 색 변수 (KAN-321, 모바일과 동일). */
export const NO_TEAM_COLOR_VAR = "--plk-accent";

/**
 * 모바일 버전 전환 추천 배너(KAN-379)를 닫았음을 기억하는 localStorage 키.
 * 한 번 닫으면 이 브라우저에서 다시 띄우지 않는다 — 매 방문 다시 뜨면
 * 추천이 아니라 잔소리다.
 */
export const SWITCH_BANNER_DISMISS_KEY = "plick-switch-banner-dismissed";

/**
 * 기사 피드를 그리는 경로 → 그 화면의 피드 surface (KAN-321).
 * GNB에서 지금 있는 페이지의 링크를 한 번 더 눌렀을 때(모바일 탭 재탭과 같은
 * 손버릇, KAN-314) 어느 피드를 첫 페이지부터 다시 받을지 찾는 데 쓴다.
 */
export const FEED_SURFACE_BY_PATH: Record<string, PostListVariant> = {
  "/": "news",
  "/articles": "article",
};

/**
 * GNB 링크 — 피그마 W1 홈(node 203-2) 상단 내비게이션 순서에 LIVE(KAN-435)를
 * 기사 뒤에 끼웠다. 모바일과 달리 기사 링크는 남긴다 — 티켓 규약이다.
 */
export const NAV_LINKS: { href: string; label: string }[] = [
  { href: "/", label: "홈" },
  { href: "/reels", label: "릴스" },
  { href: "/articles", label: "기사" },
  { href: "/live", label: "LIVE" },
  { href: "/debates", label: "VS" },
  { href: "/me", label: "MY" },
];

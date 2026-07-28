/**
 * @file 웹 앱 전용 상수. 도메인 상수(TEAMS 등)는 `@plick/domain/constants`.
 */

/**
 * 온보딩 진입 경로 — 신규 유저(`needsOnboarding`) 로그인 직후 보내는 첫 단계.
 * 이후 닉네임(1/2) → 마이팀(2/2) → 홈은 각 페이지 버튼이 이어간다.
 */
export const ONBOARDING_ENTRY = "/onboarding/nickname";

/** GNB 링크 — 피그마 W1 홈(node 203-2) 상단 내비게이션 순서 그대로 */
export const NAV_LINKS: { href: string; label: string }[] = [
  { href: "/", label: "홈" },
  { href: "/reels", label: "릴스" },
  { href: "/articles", label: "기사" },
  { href: "/me", label: "MY" },
];

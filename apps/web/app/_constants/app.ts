/**
 * @file 웹 앱 전용 상수. 도메인 상수(TEAMS 등)는 `@plick/domain/constants`.
 */

/** GNB 링크 — 피그마 W1 홈(node 203-2) 상단 내비게이션 순서 그대로 */
export const NAV_LINKS: { href: string; label: string }[] = [
  { href: "/", label: "홈" },
  { href: "/reels", label: "릴스" },
  { href: "/articles", label: "기사" },
  { href: "/me", label: "MY" },
];

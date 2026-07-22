/**
 * @file 모바일 앱 전용 상수. 도메인 상수(TEAMS 등)는 `@plick/domain/constants`.
 */
import {
  BellIcon,
  HomeIcon,
  ReelsIcon,
  SearchIcon,
  UserIcon,
} from "@plick/ui/icons";
import type { Tab } from "@/_types/app";

/**
 * 온보딩 진입 경로 — 신규 유저(`needsOnboarding`) 로그인 직후 보내는 첫 단계.
 * 이후 닉네임(1/2) → 마이팀(2/2) → 홈은 각 페이지 버튼이 이어간다.
 */
export const ONBOARDING_ENTRY = "/onboarding/nickname";

/** 하단 탭 구성 — TabBar가 그린다 */
export const TABS: Tab[] = [
  { href: "/", label: "홈", Icon: HomeIcon, match: (p) => p === "/" },
  {
    href: "/search",
    label: "검색",
    Icon: SearchIcon,
    match: (p) => p.startsWith("/search"),
  },
  {
    href: "/reels",
    label: "릴스",
    Icon: ReelsIcon,
    match: (p) => p.startsWith("/reels"),
  },
  {
    href: "/alerts",
    label: "알림",
    Icon: BellIcon,
    match: (p) => p.startsWith("/alerts"),
  },
  {
    href: "/me",
    label: "MY",
    Icon: UserIcon,
    match: (p) => p.startsWith("/me"),
  },
];

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
import type { Tab } from "./types";

/**
 * 소셜 로그인 인가 코드 자리 — 지금 BE는 mock-auth라 아무 문자열이나 받는다.
 * 실제 OAuth 리다이렉트가 붙으면 프로바이더가 주는 code로 교체된다.
 */
export const AUTH_MOCK_CODE = "mock";

/** 토큰을 담는 HttpOnly 쿠키 이름 (login이 심고, 이후 보호 API·refresh가 읽는다) */
export const AUTH_COOKIES = {
  access: "accessToken",
  refresh: "refreshToken",
} as const;

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

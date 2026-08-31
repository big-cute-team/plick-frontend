/**
 * @file 하단 탭 구성 — `_constants/app.ts`에서 분리 (KAN-428, 감사 #14).
 * TABS는 아이콘 컴포넌트 5개를 참조해서, 숫자 상수(`RESTORE_MAX_FRAMES` 등)만
 * 쓰는 모듈까지 app.ts를 거쳐 아이콘을 번들 그래프로 끌고 오게 했다. 아이콘을
 * 쓰는 건 TabBar·TopBarMenu뿐이라 탭 구성만 이 파일로 옮긴다.
 */
import {
  DebateIcon,
  HomeIcon,
  NewsIcon,
  ReelsIcon,
  UserIcon,
} from "@plick/ui/icons";
import type { Tab } from "@/_types/app";

/** 하단 탭 구성 — TabBar가 그린다. 검색·알림 탭은 기능이 없어 뺐다 (KAN-297). */
export const TABS: Tab[] = [
  {
    href: "/",
    label: "홈",
    Icon: HomeIcon,
    // 팀 허브(/teams/[slug])는 홈 화면을 팀 필터만 바꿔 그린 것이라 홈 탭이다 (KAN-350)
    match: (p) => p === "/" || p.startsWith("/teams"),
    screen: "home",
  },
  {
    href: "/articles",
    label: "기사",
    Icon: NewsIcon,
    // 기사 세부(/articles/123)도 기사 탭으로 빛낸다 — 웹 GNB와 같은 판정.
    // 다만 세부에서 탭을 누르는 건 재탭이 아니라 목록 복귀라 surface를 좁힌다
    match: (p) => p.startsWith("/articles"),
    surface: (p) => p === "/articles" || p.startsWith("/articles/teams"),
    screen: "articles",
  },
  {
    href: "/reels",
    label: "릴스",
    Icon: ReelsIcon,
    match: (p) => p.startsWith("/reels"),
    screen: "reels",
  },
  {
    href: "/debates",
    label: "토론",
    Icon: DebateIcon,
    match: (p) => p.startsWith("/debates"),
    screen: "debate",
  },
  {
    href: "/me",
    label: "MY",
    Icon: UserIcon,
    match: (p) => p.startsWith("/me"),
  },
];

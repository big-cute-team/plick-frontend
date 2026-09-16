/**
 * @file 하단 탭 구성 — `_constants/app.ts`에서 분리 (KAN-428, 감사 #14).
 * TABS는 아이콘 컴포넌트 5개를 참조해서, 숫자 상수(`RESTORE_MAX_FRAMES` 등)만
 * 쓰는 모듈까지 app.ts를 거쳐 아이콘을 번들 그래프로 끌고 오게 했다. 아이콘을
 * 쓰는 건 TabBar·TopBarMenu뿐이라 탭 구성만 이 파일로 옮긴다.
 */
import {
  HomeIcon,
  LiveIcon,
  ReelsIcon,
  UserIcon,
  VsIcon,
} from "@plick/ui/icons";
import type { Tab } from "@/_types/app";

/**
 * 하단 탭 구성 — TabBar가 그린다. 검색·알림 탭은 기능이 없어 뺐다 (KAN-297).
 * 기사 탭은 LIVE(라이브 스코어, 준비 중)로 대체했다 (KAN-435) — 기사 라우트
 * 자체는 남아 있고 탭 진입점만 빠졌다.
 */
export const TABS: Tab[] = [
  {
    href: "/",
    label: "홈",
    Icon: HomeIcon,
    /**
     * 팀 허브(`/teams/[slug]`)는 홈 화면을 팀 필터만 바꿔 그린 것이라 홈 탭이다 (KAN-350).
     * 그 아래 팀 프로필(`/teams/[slug]/profile`)은 다른 화면인데 `startsWith("/teams")`가
     * 같이 먹어서, 팀 프로필에서 홈 탭이 활성으로 보이고 **눌러도 아무 일도 안 났다**
     * (KAN-514). 활성 탭의 클릭은 이동 대신 재탭(맨 위로 + 새로고침)으로 가로채이는데,
     * 팀 프로필에는 되돌릴 홈 스크롤러가 없어 그 재탭이 빈손으로 끝난다.
     * 그래서 세그먼트가 하나인 팀 허브만 홈으로 친다.
     */
    match: (p) => p === "/" || /^\/teams\/[^/]+$/.test(p),
    screen: "home",
  },
  {
    href: "/live",
    label: "LIVE",
    Icon: LiveIcon,
    match: (p) => p.startsWith("/live"),
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
    label: "VS",
    Icon: VsIcon,
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

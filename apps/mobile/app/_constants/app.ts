/**
 * @file 모바일 앱 전용 상수. 도메인 상수(TEAMS 등)는 `@plick/domain/constants`.
 */
import { HomeIcon, ReelsIcon, UserIcon } from "@plick/ui/icons";
import type { Tab } from "@/_types/app";

/**
 * 태그된 팀이 없는 게시물의 미디어 색 CSS 변수 (KAN-271, KAN-276).
 * `MediaThumb`이 팀 컬러로 그라데이션을 만드는데 BE `teams`가 빈 배열로 올 수 있어
 * 그때 강조색으로 대신 채운다. 홈 리스트와 기사 세부가 같은 폴백을 쓴다.
 */
export const NO_TEAM_COLOR_VAR = "--plk-accent";

/**
 * flow 임베드(기사 세부)의 카드 높이 상한 — 화면 높이 대비 비율 (KAN-283).
 * 트윗 카드가 이보다 길면 릴스(useTweetFit)처럼 미디어를 숨겨 전문 텍스트를
 * 살린다. X Display Requirements상 본문은 자를 수 없어 사진만 뺀다.
 */
export const TWEET_FLOW_MAX_HEIGHT_RATIO = 0.6;

/**
 * 온보딩 진입 경로 — 신규 유저(`needsOnboarding`) 로그인 직후 보내는 첫 단계.
 * 이후 닉네임(1/2) → 마이팀(2/2) → 홈은 각 페이지 버튼이 이어간다.
 */
export const ONBOARDING_ENTRY = "/onboarding/nickname";

/** 하단 탭 구성 — TabBar가 그린다. 검색·알림 탭은 기능이 없어 뺐다 (KAN-297). */
export const TABS: Tab[] = [
  {
    href: "/",
    label: "홈",
    Icon: HomeIcon,
    match: (p) => p === "/",
    screen: "home",
  },
  {
    href: "/reels",
    label: "릴스",
    Icon: ReelsIcon,
    match: (p) => p.startsWith("/reels"),
    screen: "reels",
  },
  {
    href: "/me",
    label: "MY",
    Icon: UserIcon,
    match: (p) => p.startsWith("/me"),
  },
];

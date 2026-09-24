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
 * GNB 링크 — 시안(KAN-567) 상단 바 2줄째 순서다: 홈, 릴스, LIVE, 투표, MY.
 * KAN-435 때 기사 뒤에 끼웠던 LIVE가 릴스 뒤로 왔고 기사 링크는 뺐다 — 홈 안의
 * 표 목록이 기사 목록을 겸하고 `/articles` 라우트는 푸터와 더 보기가 잇는다.
 * LIVE는 빨간 점과 빨간 글자로 그린다(`NavItem`이 href로 판정한다).
 */
export const NAV_LINKS: { href: string; label: string }[] = [
  { href: "/", label: "홈" },
  { href: "/reels", label: "릴스" },
  { href: "/live", label: "LIVE" },
  { href: "/debates", label: "투표" },
  { href: "/me", label: "MY" },
];

/**
 * 이슈 표의 열 템플릿 (KAN-567 시안 홈 표: 팀 40, 제목 1fr, 출처 기자 128, 보도 54,
 * 조회 48, 좋아요 46). 표 머리(`PostTableHead`)와 행(`PostListItem`)·스켈레톤이 같은
 * 문자열을 써야 열이 맞는다. `lg` 아래에서는 기자·조회·좋아요 열을 접어 세 열이다 —
 * 330px에서 여섯 열은 제목이 남지 않는다.
 */
export const POST_TABLE_GRID =
  "grid grid-cols-[40px_minmax(0,1fr)_54px] lg:grid-cols-[40px_minmax(0,1fr)_128px_54px_48px_46px] items-center";

/**
 * 홈 핫이슈 카드 최대 장수 (KAN-567). 시안은 3열 한 줄이지만 BE가 사진 유무별로
 * 다섯 건씩 주므로 3열 두 줄까지만 깐다 — 세 장을 넘는 나머지는 표가 보여준다.
 */
export const HOT_CARD_COUNT = 6;

/** 표에서 `lg` 아래에 접는 열(기자·조회·좋아요)의 셀 클래스. */
export const POST_TABLE_CELL_LG = "hidden lg:block";

/** 기사 세부 "관련 기사" 칸 수 (KAN-567 시안: 2열 4건). 팀태그 기반 목록에서 자기 자신을 뺀 뒤 이만큼 보여준다. */
export const RELATED_ARTICLES_COUNT = 4;

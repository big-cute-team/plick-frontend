import type { Page } from "@playwright/test";

/**
 * 화면마다 반복되는 로케이터. 접근성 이름이 없는 랜드마크를 여기서 한 번만 좁힌다.
 * 앱에 aria-label이 붙으면 여기만 getByRole(name)으로 바꾸면 된다.
 */

/** 모바일 하단 탭바. 홈 푸터에도 nav가 둘 더 있어(팀별 이적 소식, 서비스) LIVE 링크를 가진 것으로 고른다 */
export const tabBar = (page: Page) =>
  page
    .getByRole("navigation")
    .filter({ has: page.getByRole("link", { name: "LIVE", exact: true }) });

/** 보고 있는 릴. 이웃 릴은 DOM에 같이 있고 inert다 */
export const activeReel = (page: Page) =>
  page.locator("main section:not([inert])");

/**
 * 릴의 제목 버튼. 릴 안에는 트윗 임베드(article)의 버튼도 같이 있어 그걸 뺀 첫 버튼이다.
 * 제목과 기자 줄 둘 다 세부 시트를 연다
 */
export const reelTitle = (page: Page) =>
  activeReel(page).locator("button:not(article button)").first();

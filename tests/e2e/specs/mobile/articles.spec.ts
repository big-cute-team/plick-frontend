import { LIVE_SCORE_PAUSED } from "../../../../packages/domain/src/live-pause";
import { test, expect } from "../../fixtures/failure";

/**
 * 홈 소식 리스트에서 상세로. 목록의 첫 기사 제목이 상세 h1과 같아야 한다.
 * 기사 목록 라우트(`/articles`)는 KAN-569에서 없어져 홈 리스트가 목록이다
 */
test.describe("기사", () => {
  test("목록 첫 기사를 열면 같은 제목의 상세가 뜬다", async ({ page }) => {
    await page.goto("/");

    const firstTitle = page
      .getByRole("article")
      .first()
      .getByRole("heading", { level: 3 })
      .getByRole("link");
    const title = (await firstTitle.textContent())?.trim();
    expect(title, "첫 기사 제목").toBeTruthy();
    await firstTitle.click();

    await expect(page).toHaveURL(/\/articles\/\d+$/);
    /* 헤더에도 "맨유 이슈" 같은 h1이 있어 main 안의 기사 제목을 본다 */
    await expect(
      page.getByRole("main").getByRole("heading", { level: 1 }),
    ).toHaveText(title!);
    await expect(page.getByRole("link", { name: "원문 보기" })).toBeVisible();
    /* 기사 좋아요와 댓글 좋아요가 같은 이름이라 첫 번째(기사)만 본다 */
    await expect(
      page.getByRole("main").getByRole("button", { name: "좋아요" }).first(),
    ).toBeVisible();
  });

  test("상세의 팀 해시태그를 누르면 그 팀 프로필이 뜬다", async ({ page }) => {
    await test.step("목록 첫 기사 상세로 간다", async () => {
      await page.goto("/");
      await page
        .getByRole("article")
        .first()
        .getByRole("heading", { level: 3 })
        .getByRole("link")
        .click();
      await expect(page).toHaveURL(/\/articles\/\d+$/);
    });

    /* 해시태그는 팀과 인물 모두 "#이름" 링크다. 팀 프로필로 가는 것만 고른다 */
    const hashtag = page
      .getByRole("main")
      .getByRole("link", { name: /^#/ })
      .and(page.locator('[href^="/teams/"]'))
      .first();
    await test.step("팀 해시태그를 누른다", async () => {
      await expect(hashtag).toBeVisible();
      await hashtag.click();
    });

    await test.step("그 팀 프로필이 뜬다", async () => {
      await expect(page).toHaveURL(/\/teams\/[\w-]+\/profile$/);
      /* 라이브 스코어를 닫아 둔 동안은 같은 주소에 준비중 화면이 뜬다 (KAN-644) */
      if (LIVE_SCORE_PAUSED) {
        await expect(
          page.getByRole("main").getByText("경기 정보를 준비 중이에요"),
        ).toBeVisible();
        return;
      }
      /* 제목은 BE 팀 요약의 이름이라 해시태그 정식 이름과 다를 수 있다("맨시티", KAN-604) */
      await expect(
        page.getByRole("main").getByRole("heading", { level: 1 }),
      ).not.toBeEmpty();
      /* 첫 탭은 개요다 (KAN-604) */
      await expect(
        page.getByRole("tab", { name: "개요", selected: true }),
      ).toBeVisible();
    });
  });

  test("팀 필터를 눌러도 홈(팀 허브)에 머문다", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "맨유", exact: true }).click();
    await expect(page).toHaveURL(/\/teams\/manchester-united$/);
    await expect(page.getByRole("article").first()).toBeVisible();
  });

  test("기사 더 보기를 누르면 홈 리스트에 이어 붙는다", async ({ page }) => {
    await page.goto("/");
    const articles = page.getByRole("article");
    await expect(articles.first()).toBeVisible();
    const before = await articles.count();
    /* 홈이 CDN·ISR 캐시에서 묵은 채 오면(dev는 전날 E2E 런 때 구운 페이지) 씨앗이 30분을 넘어
       마운트 직후 1페이지 재요청이 걸리고, 그동안 버튼이 disabled로 잠긴다. SSR HTML의 활성
       버튼을 보고 바로 누른 클릭이 그 잠금에 떨어지면 삼켜져 다음 페이지가 안 온다. 그래서
       클릭과 개수 확인을 한 묶음으로 두고 개수가 안 늘면 다시 누른다 (KAN-666) */
    const loadMore = page.getByRole("button", { name: "기사 더 보기" });
    await expect(async () => {
      await loadMore.click();
      await expect
        .poll(() => articles.count(), { timeout: 3_000 })
        .toBeGreaterThan(before);
    }).toPass({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/$/);
  });

  test("옛 기사 목록 주소는 홈으로 옮겨진다", async ({ page }) => {
    await page.goto("/articles/teams/manchester-united");
    await expect(page).toHaveURL(/\/teams\/manchester-united$/);
  });
});

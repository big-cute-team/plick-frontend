import { test, expect } from "../../fixtures/failure";

/** 기사 목록에서 상세로. 목록의 첫 기사 제목이 상세 h1과 같아야 한다 */
test.describe("기사", () => {
  test("목록 첫 기사를 열면 같은 제목의 상세가 뜬다", async ({ page }) => {
    await page.goto("/articles");
    await expect(
      page.getByRole("heading", { level: 1, name: "지금 올라온 소식" }),
    ).toBeVisible();

    const firstTitle = page
      .getByRole("article")
      .first()
      .getByRole("heading", { level: 3 })
      .getByRole("link");
    const title = (await firstTitle.textContent())?.trim();
    expect(title, "첫 기사 제목").toBeTruthy();
    await firstTitle.click();

    await expect(page).toHaveURL(/\/articles\/\d+$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title!);
    await expect(page.getByRole("link", { name: "원문" })).toBeVisible();
    /* 기사 좋아요와 댓글 좋아요가 같은 이름이라 첫 번째(기사)만 본다 */
    await expect(
      page.getByRole("main").getByRole("button", { name: "좋아요" }).first(),
    ).toBeVisible();
  });

  test("상세의 팀 해시태그를 누르면 그 팀 프로필이 뜬다", async ({ page }) => {
    await test.step("목록 첫 기사 상세로 간다", async () => {
      await page.goto("/articles");
      await page
        .getByRole("article")
        .first()
        .getByRole("heading", { level: 3 })
        .getByRole("link")
        .click();
      await expect(page).toHaveURL(/\/articles\/\d+$/);
    });

    /* 팀 해시태그는 "#팀 이름" 링크다. 인물 태그는 #이 없다 */
    const hashtag = page.getByRole("main").getByRole("link", { name: /^#/ });
    let teamName = "";
    await test.step("팀 해시태그를 누른다", async () => {
      await expect(hashtag).toBeVisible();
      teamName = (await hashtag.textContent())!.trim().replace(/^#/, "");
      await hashtag.click();
    });

    await test.step("그 팀 프로필이 뜬다", async () => {
      await expect(page).toHaveURL(/\/teams\/[\w-]+\/profile$/);
      /* 헤더 배너에도 짧은 팀 이름 h1이 있어 main 안의 정식 이름을 본다 */
      await expect(
        page.getByRole("main").getByRole("heading", { level: 1 }),
      ).toHaveText(teamName);
      await expect(
        page.getByRole("tablist", { name: "팀 프로필 보기" }),
      ).toBeVisible();
    });
  });

  test("팀 필터로 팀별 목록에 간다", async ({ page }) => {
    await page.goto("/articles");
    await page.getByRole("link", { name: "맨유", exact: true }).click();
    await expect(page).toHaveURL(/\/articles\/teams\/manchester-united$/);
    await expect(page.getByRole("article").first()).toBeVisible();
  });
});

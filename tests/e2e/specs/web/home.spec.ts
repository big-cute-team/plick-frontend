import { test, expect } from "../../fixtures/failure";

/** 데스크톱 홈. 주 메뉴가 있고 이슈 표는 더 보기로 홈 안에서 이어 받는다(KAN-569) */
test.describe("홈", () => {
  test("첫 화면에 핫이슈와 주 메뉴가 뜬다", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: /해축이모/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "핫이슈" }),
    ).toBeVisible();
    const nav = page.getByRole("navigation", { name: "주 메뉴" });
    for (const label of ["홈", "릴스", "LIVE", "투표", "MY"]) {
      await expect(
        nav.getByRole("link", { name: label, exact: true }),
      ).toBeVisible();
    }
  });

  test("이슈 더 보기를 누르면 홈 표에 이어 붙는다", async ({ page }) => {
    await page.goto("/");
    const rows = page.getByRole("main").getByRole("article");
    await expect(rows.first()).toBeVisible();
    const before = await rows.count();
    await page.getByRole("button", { name: "이슈 더 보기" }).click();
    await expect.poll(() => rows.count()).toBeGreaterThan(before);
    await expect(page).toHaveURL(/\/$/);
  });
});

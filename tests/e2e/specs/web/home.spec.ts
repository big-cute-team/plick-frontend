import { test, expect } from "../../fixtures/failure";

/** 데스크톱 홈. 주 메뉴가 있고 푸터 링크로 이슈 목록에 간다(KAN-567 리디자인으로 기사 메뉴가 빠졌다) */
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

  test("푸터의 이슈 링크로 목록에 간다", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("contentinfo")
      .getByRole("link", { name: "이슈", exact: true })
      .click();
    await expect(page).toHaveURL(/\/articles$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "이슈" }),
    ).toBeVisible();
  });
});

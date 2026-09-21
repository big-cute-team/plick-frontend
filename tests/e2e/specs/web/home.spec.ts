import { test, expect } from "../../fixtures/failure";

/** 데스크톱 홈. 주 메뉴가 있고 기사로 이동한다 */
test.describe("홈", () => {
  test("첫 화면에 핫이슈와 주 메뉴가 뜬다", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: /플릭 PLick/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "핫이슈" }),
    ).toBeVisible();
    const nav = page.getByRole("navigation", { name: "주 메뉴" });
    for (const label of ["홈", "릴스", "기사", "LIVE", "VS", "MY"]) {
      await expect(
        nav.getByRole("link", { name: label, exact: true }),
      ).toBeVisible();
    }
  });

  test("주 메뉴에서 기사 목록으로 간다", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "주 메뉴" })
      .getByRole("link", { name: "기사", exact: true })
      .click();
    await expect(page).toHaveURL(/\/articles$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "지금 올라온 소식" }),
    ).toBeVisible();
  });
});

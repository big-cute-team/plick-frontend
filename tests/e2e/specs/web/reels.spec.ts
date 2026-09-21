import { test, expect } from "../../fixtures/failure";

/** 데스크톱 릴스. 첫 릴 URL로 붙고 액션이 있다 */
test.describe("릴스", () => {
  test("진입하면 첫 릴이 열린다", async ({ page }) => {
    await page.goto("/reels");
    await expect(page).toHaveURL(/\/reels\/\d+$/);
    await expect(
      page.getByRole("button", { name: "좋아요" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "공유" }).first(),
    ).toBeVisible();
  });
});

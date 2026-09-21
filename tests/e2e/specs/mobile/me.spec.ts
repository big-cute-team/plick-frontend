import { test, expect } from "../../fixtures/failure";

/** 로그인 안 한 MY 탭. 계정 연동 안내가 보이고 누르면 로그인 화면으로 간다 */
test.describe("MY(게스트)", () => {
  test("계정 연동 안내에서 로그인 화면으로 간다", async ({ page }) => {
    await page.goto("/me");
    const cta = page.getByRole("link", { name: /계정을 연동/ });
    await expect(cta).toBeVisible();
    await cta.click();
    await expect(page).toHaveURL(/\/login/);
  });
});

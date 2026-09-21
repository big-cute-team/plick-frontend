import { test, expect } from "../../fixtures/failure";

/** 데스크톱 VS 목록. 카드가 있고 기사로 이어진다 */
test.describe("VS", () => {
  test("목록이 뜨고 첫 카드가 기사로 이어진다", async ({ page }) => {
    await page.goto("/debates");
    await expect(
      page.getByRole("heading", { level: 1, name: "VS" }),
    ).toBeVisible();
    const cards = page
      .getByRole("main")
      .getByRole("list")
      .getByRole("listitem");
    await expect(cards.first()).toBeVisible();
    await cards.first().getByRole("link").click();
    await expect(page).toHaveURL(/\/articles\/\d+$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

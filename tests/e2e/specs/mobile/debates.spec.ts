import { test, expect } from "../../fixtures/failure";

/** VS(토론) 목록. 카드가 하나 이상 있고 누르면 기사 상세로 간다. 투표는 로그인이 필요해 여기서 하지 않는다 */
test.describe("투표", () => {
  test("목록이 뜨고 첫 카드가 기사로 이어진다", async ({ page }) => {
    await page.goto("/debates");
    await expect(
      page.getByRole("heading", { level: 1, name: "투표" }),
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

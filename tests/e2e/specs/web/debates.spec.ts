import { test, expect } from "../../fixtures/failure";

/**
 * 데스크톱 VS 목록. 카드가 있고 기사로 이어진다.
 * 진행 중 투표는 비어 있는 날이 있어 늘 카드가 있는 마감 탭을 본다. 옆 급상승 목록도 list라 투표 카드만 고른다
 */
test.describe("투표", () => {
  test("목록이 뜨고 첫 카드가 기사로 이어진다", async ({ page }) => {
    await page.goto("/debates");
    await expect(
      page.getByRole("heading", { level: 1, name: "투표" }),
    ).toBeVisible();
    await page.getByRole("tab", { name: "마감" }).click();
    const cards = page
      .getByRole("main")
      .getByRole("listitem")
      .filter({ has: page.getByRole("region", { name: "투표" }) });
    await expect(cards.first()).toBeVisible();
    await cards.first().getByRole("link", { name: "기사 보기" }).click();
    await expect(page).toHaveURL(/\/articles\/\d+$/);
    await expect(
      page.getByRole("main").getByRole("heading", { level: 1 }),
    ).toBeVisible();
  });
});

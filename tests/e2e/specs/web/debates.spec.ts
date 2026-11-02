import { test, expect } from "../../fixtures/failure";

/** VS의 세 탭과 카드 전체를 통한 게시물 진입을 확인한다. */
test.describe("VS", () => {
  test("세 탭을 표시하고 밸런스게임 카드를 누르면 기사로 이어진다", async ({
    page,
  }) => {
    await page.goto("/debates");
    await expect(
      page.getByRole("heading", { level: 1, name: "VS" }),
    ).toBeVisible();
    for (const name of ["밸런스게임", "승부예측", "랭킹"]) {
      await expect(page.getByRole("tab", { name, exact: true })).toBeVisible();
    }
    const card = page.getByRole("link", { name: /게시물 보기$/ }).first();
    await expect(card).toBeVisible();
    await card.click();
    await expect(page).toHaveURL(/\/articles\/\d+$/);
    await expect(
      page.getByRole("main").getByRole("heading", { level: 1 }),
    ).toBeVisible();
  });
});

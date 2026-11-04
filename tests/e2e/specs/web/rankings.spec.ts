import { test, expect } from "../../fixtures/failure";

/**
 * 데스크톱 랭킹 페이지(KAN-724에서 VS 탭에서 GNB 탭으로 뺐다). 비로그인은 표가 블러로 가려지고 로그인 안내가
 * 덮인다. 옛 VS 랭킹 탭 주소는 이 페이지로 넘어온다.
 */
test.describe("랭킹", () => {
  test("주 메뉴의 랭킹으로 들어가면 비로그인은 로그인 안내가 덮인다", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "주 메뉴" })
      .getByRole("link", { name: "랭킹", exact: true })
      .click();
    await expect(page).toHaveURL(/\/rankings$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "랭킹" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "시즌 랭킹" }),
    ).toBeVisible();
    await expect(
      page.getByText("고수들의 적중 기록은 로그인하면 볼 수 있어요"),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /하고 보기$/ }),
    ).toHaveAttribute("href", "/login");
  });

  test("옛 VS 랭킹 탭 주소는 랭킹 페이지로 옮겨진다", async ({ page }) => {
    await page.goto("/debates?tab=rank");
    await expect(page).toHaveURL(/\/rankings$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "랭킹" }),
    ).toBeVisible();
  });
});

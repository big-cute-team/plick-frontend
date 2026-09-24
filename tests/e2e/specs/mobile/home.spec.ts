import { test, expect } from "../../fixtures/failure";
import { tabBar } from "../../fixtures/locators";

/**
 * 홈 진입. 앱의 첫 화면이 뜨고 탭바로 다른 화면에 갈 수 있는지 본다.
 * 트윗 임베드가 계속 폴링해서 networkidle은 끝나지 않는다. 로드 이벤트까지만 기다리고 헤딩으로 판정한다.
 */
test.describe("홈", () => {
  test("첫 화면에 핫이슈와 탭바가 뜬다", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: /해축이모/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "핫이슈" }),
    ).toBeVisible();

    const nav = tabBar(page);
    for (const label of ["홈", "LIVE", "릴스", "투표", "MY"]) {
      await expect(
        nav.getByRole("link", { name: label, exact: true }),
      ).toBeVisible();
    }
  });

  test("탭바에서 릴스로 넘어가면 릴 하나가 열린다", async ({ page }) => {
    await page.goto("/");
    await tabBar(page).getByRole("link", { name: "릴스", exact: true }).click();
    await expect(page).toHaveURL(/\/reels\/\d+$/);
    await expect(
      page.getByRole("button", { name: "좋아요" }).first(),
    ).toBeVisible();
  });
});

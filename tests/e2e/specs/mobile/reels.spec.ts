import { test, expect } from "../../fixtures/failure";
import { activeReel, reelTitle } from "../../fixtures/locators";
import { swipeUp } from "../../fixtures/gestures";

/** 릴스 피드. 진입하면 첫 릴 URL로 붙고, 넘기면 URL의 id가 바뀌고, 제목을 누르면 세부 시트가 뜬다 */
test.describe("릴스", () => {
  test("진입하면 첫 릴이 열리고 액션 레일이 있다", async ({ page }) => {
    await page.goto("/reels");
    await expect(page).toHaveURL(/\/reels\/\d+$/);
    const reel = activeReel(page);
    await expect(reel).toHaveCount(1);
    await expect(reel.getByRole("button", { name: "좋아요" })).toBeVisible();
    await expect(reel.getByRole("button", { name: "공유" })).toBeVisible();
  });

  test("위로 쓸어 올리면 다음 릴로 바뀐다", async ({ page }) => {
    await page.goto("/reels");
    await expect(page).toHaveURL(/\/reels\/\d+$/);
    /* 제스처 리스너는 하이드레이션 뒤에 붙는다. 액션 레일이 보이면 붙은 것이다 */
    await expect(
      activeReel(page).getByRole("button", { name: "좋아요" }),
    ).toBeVisible();
    const first = page.url();
    await expect
      .poll(
        async () => {
          await swipeUp(page);
          return page.url();
        },
        { message: "릴 URL이 바뀌어야 한다", intervals: [500, 1000, 1000] },
      )
      .not.toBe(first);
    await expect(page).toHaveURL(/\/reels\/\d+$/);
  });

  test("제목을 누르면 기사 세부 시트가 열리고 닫힌다", async ({ page }) => {
    await page.goto("/reels");
    await expect(page).toHaveURL(/\/reels\/\d+$/);
    await reelTitle(page).click();
    const sheet = page.getByRole("dialog", { name: "기사 세부" });
    await expect(sheet).toBeVisible();
    await sheet.getByRole("button", { name: "닫기" }).click();
    await expect(sheet).toBeHidden();
  });
});

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

  test("공유를 누르면 링크 공유 창이 뜨고 닫힌다", async ({ page }) => {
    /* /e2e 스킬로 만든 첫 시나리오. explore로 확인한 이름: dialog "링크 공유", button "링크 복사"·"닫기" */
    await test.step("릴스에 들어간다", async () => {
      await page.goto("/reels");
      await expect(page).toHaveURL(/\/reels\/\d+$/);
    });
    const dialog = page.getByRole("dialog", { name: "링크 공유" });
    await test.step("보고 있는 릴의 공유를 누른다", async () => {
      /* 이웃 릴에도 공유 버튼이 있어 보고 있는 릴 안으로 좁힌다. 창은 dynamic import라 잠시 뒤 뜬다 */
      await activeReel(page).getByRole("button", { name: "공유" }).click();
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByRole("button", { name: "링크 복사" }),
      ).toBeVisible();
    });
    await test.step("닫기를 누르면 사라진다", async () => {
      /* "닫기"가 둘이다. 첫 번째는 카드 뒤 스크림이라 가려져 못 누르고, 마지막이 카드의 X 버튼이다 */
      await dialog.getByRole("button", { name: "닫기" }).last().click();
      await expect(dialog).toBeHidden();
    });
  });
});

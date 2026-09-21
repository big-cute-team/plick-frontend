import { test, expect } from "../../fixtures/failure";

/** 데스크톱 기사 목록에서 상세로. 상세에는 댓글 입력이 있다 */
test.describe("기사", () => {
  test("목록 첫 기사를 열면 같은 제목의 상세와 댓글 입력이 뜬다", async ({
    page,
  }) => {
    await page.goto("/articles");
    const first = page
      .getByRole("main")
      .getByRole("link", { name: /.+/ })
      .filter({ has: page.getByRole("heading", { level: 2 }) })
      .first();
    const title = (
      await first.getByRole("heading", { level: 2 }).textContent()
    )?.trim();
    expect(title, "첫 기사 제목").toBeTruthy();
    await first.click();

    await expect(page).toHaveURL(/\/articles\/\d+$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title!);
    await expect(
      page.getByRole("textbox", { name: "댓글 입력" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "좋아요" }).first(),
    ).toBeVisible();
  });
});

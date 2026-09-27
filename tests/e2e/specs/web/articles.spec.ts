import { test, expect } from "../../fixtures/failure";

/**
 * 데스크톱 홈 이슈 표에서 상세로. 상세에는 댓글 입력이 있다.
 * 표 행 제목은 h3 안의 링크다. 위 핫이슈 카드의 h3는 링크를 품지 않아 첫 매치가 표 첫 행이 된다
 */
test.describe("기사", () => {
  test("목록 첫 기사를 열면 같은 제목의 상세와 댓글 입력이 뜬다", async ({
    page,
  }) => {
    await page.goto("/");
    const first = page
      .getByRole("main")
      .getByRole("heading", { level: 3 })
      .getByRole("link")
      .first();
    const title = (await first.textContent())?.trim();
    expect(title, "첫 기사 제목").toBeTruthy();
    await first.click();

    await expect(page).toHaveURL(/\/articles\/\d+$/);
    await expect(
      page.getByRole("main").getByRole("heading", { level: 1 }),
    ).toHaveText(title!);
    await expect(
      page.getByRole("textbox", { name: "댓글 입력" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "좋아요" }).first(),
    ).toBeVisible();
  });
});

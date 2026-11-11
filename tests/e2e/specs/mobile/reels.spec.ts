import { test, expect } from "../../fixtures/failure";
import { activeReel, reelTitle } from "../../fixtures/locators";
import { swipeUp } from "../../fixtures/gestures";
import {
  hasSession,
  holdAppScripts,
  holdServerActions,
  isHydrated,
  recordText,
  reloadHolding,
} from "../../fixtures/optimistic";

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

  test("제목을 누르면 릴 세부 시트가 열리고 닫힌다", async ({ page }) => {
    await page.goto("/reels");
    await expect(page).toHaveURL(/\/reels\/\d+$/);
    await reelTitle(page).click();
    const sheet = page.getByRole("dialog", { name: "릴 세부" });
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

  /* KAN-748 회귀. 서버 액션은 붙잡아 BE에 보내지 않아 dev에 좋아요가 남지 않는다 */
  test("피드를 다시 받는 중에 눌러도 좋아요 수가 안 내려간다", async ({
    page,
  }) => {
    test.skip(
      process.env.E2E_TARGET === "prod",
      "게스트 세션을 받아야 해서 읽기 전용 대상에서는 돌지 않는다",
    );
    await page.goto("/reels");
    await expect(page).toHaveURL(/\/reels\/\d+$/);
    await expect.poll(() => hasSession(page)).toBe(true);

    /* 시계를 앞당겨 씨앗을 묵게 만든다. 다시 열면 피드를 다시 받는다. 그 응답(누르기 전 수)을
       받아 두고 누른 뒤에 돌려준다 */
    await page.clock.setSystemTime(Date.now() + 31 * 60 * 1000);
    await holdServerActions(page);
    const feed = await reloadHolding(page, /\/api\/v1\/reels/);
    await feed.fetched;

    const like = activeReel(page).getByRole("button", { name: "좋아요" });
    const history = await recordText(like);
    await like.click();
    await expect(like).toHaveAttribute("aria-pressed", "true");

    await feed.released;
    /* 돌아온 응답이 화면에 반영될 틈을 준다. 내려갔다면 이 사이에 기록된다 */
    await page.waitForTimeout(500);
    const counts = await history();
    expect(counts.length, `좋아요 수 변화 ${counts.join(" > ")}`).toBe(2);
    expect(counts[1]).not.toBe(counts[0]);
  });

  /* KAN-750 회귀. 스크립트를 붙잡아 서버 HTML만 그려진 화면에서 누른다 */
  test("스크립트가 붙기 전에 누른 좋아요도 붙은 뒤에 반영된다", async ({
    page,
  }) => {
    test.skip(
      process.env.E2E_TARGET === "prod",
      "게스트 세션을 받아야 해서 읽기 전용 대상에서는 돌지 않는다",
    );
    await page.goto("/reels");
    await expect.poll(() => hasSession(page)).toBe(true);

    await holdServerActions(page);
    const releaseScripts = await holdAppScripts(page);
    await page.goto("/reels", { waitUntil: "domcontentloaded" });

    const like = activeReel(page).getByRole("button", { name: "좋아요" });
    await like.click();
    expect(await isHydrated(like), "누를 때는 아직 붙기 전").toBe(false);
    await expect(like).toHaveAttribute("aria-pressed", "false");

    releaseScripts();
    await expect(like).toHaveAttribute("aria-pressed", "true");
  });
});

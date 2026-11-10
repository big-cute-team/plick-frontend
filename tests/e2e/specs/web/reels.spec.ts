import { test, expect } from "../../fixtures/failure";
import {
  hasSession,
  holdAppScripts,
  holdServerActions,
  isHydrated,
  recordText,
  reloadHolding,
} from "../../fixtures/optimistic";

/** 데스크톱 릴스. 첫 릴 URL로 붙고 액션이 있다 */
test.describe("릴스", () => {
  test("진입하면 첫 릴이 열린다", async ({ page }) => {
    await page.goto("/reels");
    await expect(page).toHaveURL(/\/reels\/\d+$/);
    await expect(
      page.getByRole("button", { name: "좋아요" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "공유" }).first(),
    ).toBeVisible();
  });

  /* 아래 둘은 KAN-748 회귀다. 서버 액션은 붙잡아 BE에 보내지 않아 dev에 좋아요가 남지 않는다 */
  test("세부 패널이 기사 상세를 받은 뒤에도 좋아요가 찬다", async ({
    page,
  }) => {
    test.skip(
      process.env.E2E_TARGET === "prod",
      "게스트 세션을 받아야 해서 읽기 전용 대상에서는 돌지 않는다",
    );
    /* 세부 패널은 기자 목록 때문에 기사 상세를 받아 캐시에 둔다. 좋아요를 피드 캐시에 옮겨 적다가
       이 엔트리에서 예외가 나 클릭이 통째로 무산됐었다 */
    const detail = page.waitForResponse(
      (response) =>
        /\/api\/v1\/articles\/\d+$/.test(new URL(response.url()).pathname) &&
        response.request().method() === "GET",
    );
    await page.goto("/reels");
    await expect(page).toHaveURL(/\/reels\/\d+$/);
    await detail;
    await expect.poll(() => hasSession(page)).toBe(true);

    await holdServerActions(page);
    const like = page.getByRole("button", { name: "좋아요" }).first();
    await like.click();
    await expect(like).toHaveAttribute("aria-pressed", "true");
  });

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

    const like = page.getByRole("button", { name: "좋아요" }).first();
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

    const like = page.getByRole("button", { name: "좋아요" }).first();
    await like.click();
    expect(await isHydrated(like), "누를 때는 아직 붙기 전").toBe(false);
    await expect(like).toHaveAttribute("aria-pressed", "false");

    releaseScripts();
    await expect(like).toHaveAttribute("aria-pressed", "true");
  });
});

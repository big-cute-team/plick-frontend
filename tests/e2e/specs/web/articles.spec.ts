import type { Page } from "@playwright/test";
import { test, expect } from "../../fixtures/failure";
import {
  gateRequest,
  hasSession,
  holdAppScripts,
  holdServerActions,
  isHydrated,
  recordPressed,
  reloadHolding,
} from "../../fixtures/optimistic";

/** 홈 이슈 표의 첫 기사 상세로 간다 */
async function openFirstArticle(page: Page) {
  await page
    .getByRole("main")
    .getByRole("heading", { level: 3 })
    .getByRole("link")
    .first()
    .click();
  await expect(page).toHaveURL(/\/articles\/\d+$/);
}

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

  /* 아래 둘은 KAN-748 회귀다. 서버 액션은 붙잡아 BE에 보내지 않아 dev에 좋아요가 남지 않는다 */
  test("내 상태 응답이 늦게 와도 열자마자 누른 좋아요가 안 빠진다", async ({
    page,
  }) => {
    test.skip(
      process.env.E2E_TARGET === "prod",
      "게스트 세션을 받아야 해서 읽기 전용 대상에서는 돌지 않는다",
    );
    await test.step("목록 첫 기사 상세로 가서 세션을 받는다", async () => {
      await page.goto("/");
      await openFirstArticle(page);
      await expect.poll(() => hasSession(page)).toBe(true);
    });

    /* 다시 열면 내 상태 조회가 바로 나간다. 그 응답(누르기 전 상태)을 받아 두고 누른 뒤에 돌려준다 */
    await holdServerActions(page);
    const state = await reloadHolding(page, /\/users\/me\/article-states/);
    await state.fetched;

    const like = page.getByRole("button", { name: "좋아요" }).first();
    const history = await recordPressed(like);
    await like.click();
    await expect(like).toHaveAttribute("aria-pressed", "true");

    await state.released;
    /* 돌아온 응답이 화면에 반영될 틈을 준다. 빠졌다면 이 사이에 기록된다 */
    await page.waitForTimeout(500);
    expect(await history(), "aria-pressed 변화").toEqual(["false", "true"]);
  });

  test("세션이 없는 첫 방문자가 눌러도 좋아요가 바로 찬다", async ({
    page,
  }) => {
    test.skip(
      process.env.E2E_TARGET === "prod",
      "게스트 세션을 받아야 해서 읽기 전용 대상에서는 돌지 않는다",
    );
    /* 게스트 발급 요청을 붙잡아 둔다. 그동안은 세션이 없는 사람이다 */
    const issueGuest = await gateRequest(page, "**/api/session/guest");
    await holdServerActions(page);
    const guestRequest = page.waitForRequest("**/api/session/guest");
    await page.goto("/");
    await guestRequest;
    await openFirstArticle(page);

    const like = page.getByRole("button", { name: "좋아요" }).first();
    const history = await recordPressed(like);
    await like.click();
    /* 발급이 끝나기 전인데도 차야 한다 */
    await expect(like).toHaveAttribute("aria-pressed", "true", {
      timeout: 2_000,
    });

    const issued = page.waitForResponse("**/api/session/guest");
    issueGuest();
    await issued;
    await expect.poll(() => hasSession(page)).toBe(true);
    await page.waitForTimeout(500);
    expect(await history(), "aria-pressed 변화").toEqual(["false", "true"]);
  });

  /* KAN-750 회귀. 스크립트를 붙잡아 서버 HTML만 그려진 화면에서 누른다 */
  test("스크립트가 붙기 전에 누른 좋아요도 붙은 뒤에 반영된다", async ({
    page,
  }) => {
    test.skip(
      process.env.E2E_TARGET === "prod",
      "게스트 세션을 받아야 해서 읽기 전용 대상에서는 돌지 않는다",
    );
    await page.goto("/");
    await expect.poll(() => hasSession(page)).toBe(true);
    const href = await page
      .getByRole("main")
      .getByRole("heading", { level: 3 })
      .getByRole("link")
      .first()
      .getAttribute("href");
    expect(href, "첫 기사 주소").toMatch(/^\/articles\/\d+$/);

    await holdServerActions(page);
    const releaseScripts = await holdAppScripts(page);
    /* 주소로 바로 연다. 목록에서 눌러 들어가면 서버 HTML 없이 브라우저가 그린다 */
    await page.goto(href!, { waitUntil: "domcontentloaded" });

    const like = page
      .getByRole("main")
      .getByRole("button", { name: "좋아요" })
      .first();
    await like.click();
    expect(await isHydrated(like), "누를 때는 아직 붙기 전").toBe(false);
    await expect(like).toHaveAttribute("aria-pressed", "false");

    releaseScripts();
    await expect(like).toHaveAttribute("aria-pressed", "true");
  });
});

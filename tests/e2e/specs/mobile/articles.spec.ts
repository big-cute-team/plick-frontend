import { LIVE_SCORE_PAUSED } from "../../../../packages/domain/src/live-pause";
import { test, expect } from "../../fixtures/failure";
import { mobileNewsFeed } from "../../fixtures/locators";
import {
  gateRequest,
  hasSession,
  holdServerActions,
  recordPressed,
  reloadHolding,
} from "../../fixtures/optimistic";

/**
 * 홈 소식 리스트에서 상세로. 목록의 첫 기사 제목이 상세 h1과 같아야 한다.
 * 기사 목록 라우트(`/articles`)는 KAN-569에서 없어져 홈 리스트가 목록이다
 */
test.describe("기사", () => {
  test("목록 첫 기사를 열면 같은 제목의 상세가 뜬다", async ({ page }) => {
    await page.goto("/");

    const firstTitle = mobileNewsFeed(page)
      .getByRole("article")
      .first()
      .getByRole("heading", { level: 3 })
      .getByRole("link");
    const title = (await firstTitle.textContent())?.trim();
    expect(title, "첫 기사 제목").toBeTruthy();
    await firstTitle.click();

    await expect(page).toHaveURL(/\/articles\/\d+$/);
    /* 헤더에도 "맨유 이슈" 같은 h1이 있어 main 안의 기사 제목을 본다 */
    await expect(
      page.getByRole("main").getByRole("heading", { level: 1 }),
    ).toHaveText(title!);
    await expect(
      page.getByRole("link", { name: "원문 기사 바로가기" }),
    ).toBeVisible();
    /* 기사 좋아요와 댓글 좋아요가 같은 이름이라 첫 번째(기사)만 본다 */
    await expect(
      page.getByRole("main").getByRole("button", { name: "좋아요" }).first(),
    ).toBeVisible();
  });

  test("상세의 팀 해시태그를 누르면 그 팀 프로필이 뜬다", async ({ page }) => {
    await test.step("목록 첫 기사 상세로 간다", async () => {
      await page.goto("/");
      await mobileNewsFeed(page)
        .getByRole("article")
        .first()
        .getByRole("heading", { level: 3 })
        .getByRole("link")
        .click();
      await expect(page).toHaveURL(/\/articles\/\d+$/);
    });

    /* 해시태그는 팀과 인물 모두 "#이름" 링크다. 팀 프로필로 가는 것만 고른다 */
    const hashtag = page
      .getByRole("main")
      .getByRole("link", { name: /^#/ })
      .and(page.locator('[href^="/teams/"]'))
      .first();
    await test.step("팀 해시태그를 누른다", async () => {
      await expect(hashtag).toBeVisible();
      await hashtag.click();
    });

    await test.step("그 팀 프로필이 뜬다", async () => {
      await expect(page).toHaveURL(/\/teams\/[\w-]+\/profile$/);
      /* 라이브 스코어를 닫아 둔 동안은 같은 주소에 준비중 화면이 뜬다 (KAN-644) */
      if (LIVE_SCORE_PAUSED) {
        await expect(
          page.getByRole("main").getByText("경기 정보를 준비 중이에요"),
        ).toBeVisible();
        return;
      }
      /* 제목은 BE 팀 요약의 이름이라 해시태그 정식 이름과 다를 수 있다("맨시티", KAN-604) */
      await expect(
        page.getByRole("main").getByRole("heading", { level: 1 }),
      ).not.toBeEmpty();
      /* 첫 탭은 개요다 (KAN-604) */
      await expect(
        page.getByRole("tab", { name: "개요", selected: true }),
      ).toBeVisible();
    });
  });

  test("팀 필터를 눌러도 홈(팀 허브)에 머문다", async ({ page }) => {
    await page.goto("/");
    await mobileNewsFeed(page)
      .getByRole("link", { name: "맨체스터 유나이티드", exact: true })
      .click();
    await expect(page).toHaveURL(/\/teams\/manchester-united$/);
    await expect(
      mobileNewsFeed(page).getByRole("article").first(),
    ).toBeVisible();
  });

  test("기사 더 보기를 누르면 홈 리스트에 이어 붙는다", async ({ page }) => {
    await page.goto("/");
    const feed = mobileNewsFeed(page);
    const articles = feed.getByRole("article");
    await expect(articles.first()).toBeVisible();
    const before = await articles.count();
    /* 홈이 CDN·ISR 캐시에서 묵은 채 오면(dev는 전날 E2E 런 때 구운 페이지) 씨앗이 30분을 넘어
       마운트 직후 1페이지 재요청이 걸리고, 그동안 버튼이 disabled로 잠긴다. SSR HTML의 활성
       버튼을 보고 바로 누른 클릭이 그 잠금에 떨어지면 삼켜져 다음 페이지가 안 온다. 그래서
       클릭과 개수 확인을 한 묶음으로 두고 개수가 안 늘면 다시 누른다 (KAN-666) */
    const loadMore = feed.getByRole("button", { name: "기사 더 보기" });
    await expect(async () => {
      await loadMore.click();
      await expect
        .poll(() => articles.count(), { timeout: 3_000 })
        .toBeGreaterThan(before);
    }).toPass({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/$/);
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
      await mobileNewsFeed(page)
        .getByRole("article")
        .first()
        .getByRole("heading", { level: 3 })
        .getByRole("link")
        .click();
      await expect(page).toHaveURL(/\/articles\/\d+$/);
      await expect.poll(() => hasSession(page)).toBe(true);
    });

    /* 다시 열면 내 상태 조회가 바로 나간다. 그 응답(누르기 전 상태)을 받아 두고 누른 뒤에 돌려준다 */
    await holdServerActions(page);
    const state = await reloadHolding(page, /\/users\/me\/article-states/);
    await state.fetched;

    const like = page
      .getByRole("main")
      .getByRole("button", { name: "좋아요" })
      .first();
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
    await mobileNewsFeed(page)
      .getByRole("article")
      .first()
      .getByRole("heading", { level: 3 })
      .getByRole("link")
      .click();
    await expect(page).toHaveURL(/\/articles\/\d+$/);

    const like = page
      .getByRole("main")
      .getByRole("button", { name: "좋아요" })
      .first();
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

  test("옛 기사 목록 주소는 홈으로 옮겨진다", async ({ page }) => {
    await page.goto("/articles/teams/manchester-united");
    await expect(page).toHaveURL(/\/teams\/manchester-united$/);
  });
});

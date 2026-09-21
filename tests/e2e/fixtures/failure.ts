import { test as base, expect, type Page } from "@playwright/test";

/**
 * 실패 산출물 fixture.
 *
 * 테스트가 실패하면 그 시점의 화면을 사람과 에이전트가 같은 형식으로 읽을 수 있게
 * 세 가지를 첨부한다. 접근성 스냅샷(픽셀이 아니라 role·name 트리), 콘솔 오류, 실패한 네트워크 요청.
 * trace.zip에도 같은 정보가 있지만 압축을 풀어야 해서, scripts/e2e/bundle.mjs가 results.json의
 * 첨부만 읽어도 되게 여기서 텍스트로 떠 둔다.
 *
 * 모든 spec은 @playwright/test 대신 이 파일의 test·expect를 import한다.
 */
/** prod를 상대로 돌 때 막는 요청 메서드. 실수로 쓰기 시나리오가 섞여도 실서비스 데이터에 닿지 않는다 */
const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const test = base.extend<{ page: Page }>({
  page: async ({ page }, use, testInfo) => {
    if (process.env.E2E_TARGET === "prod") {
      await page.route("**/*", (route) =>
        READ_METHODS.has(route.request().method())
          ? route.continue()
          : route.abort("blockedbyclient"),
      );
    }

    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("requestfailed", (req) => {
      failedRequests.push(
        `${req.method()} ${req.url()} ${req.failure()?.errorText ?? ""}`,
      );
    });
    page.on("response", (res) => {
      if (res.status() >= 500)
        failedRequests.push(
          `${res.request().method()} ${res.url()} ${res.status()}`,
        );
    });

    await use(page);

    if (testInfo.status === testInfo.expectedStatus) return;
    /* 페이지가 이미 닫혔으면 스냅샷은 건너뛴다. 첨부 실패로 원래 오류를 가리지 않는다 */
    const aria = await page
      .locator("body")
      .ariaSnapshot()
      .catch(() => "(페이지가 닫혀 스냅샷을 뜨지 못했다)");
    await testInfo.attach("aria-snapshot", {
      body: aria,
      contentType: "text/plain",
    });
    await testInfo.attach("console-errors", {
      body: consoleErrors.join("\n"),
      contentType: "text/plain",
    });
    await testInfo.attach("failed-requests", {
      body: failedRequests.join("\n"),
      contentType: "text/plain",
    });
    await testInfo.attach("url", {
      body: page.url(),
      contentType: "text/plain",
    });
  },
});

export { expect };

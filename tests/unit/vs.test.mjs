import { test } from "node:test";
import assert from "node:assert/strict";
import { closedLast, isBalanceClosed } from "../../packages/domain/src/vs.ts";
import { matchTabsFor as mobileTabs } from "../../apps/mobile/app/_constants/live.ts";
import { matchTabsFor as webTabs } from "../../apps/web/app/_constants/live.ts";
import { getPredictionFeed } from "../../packages/core/src/predictions.ts";

test("VS 목록은 원본을 바꾸지 않고 진행 중 → 마감 순서를 유지한다", () => {
  const now = Date.parse("2026-11-02T00:00:00Z");
  const items = [
    { id: 1, contentType: "FINISH", closesAt: null },
    { id: 2, contentType: "DEBATE", closesAt: "2026-11-03T00:00:00Z" },
    { id: 3, contentType: "DEBATE", closesAt: "2026-11-01T00:00:00Z" },
    { id: 4, contentType: "DEBATE", closesAt: null },
  ];
  assert.deepEqual(
    closedLast(items, (item) => isBalanceClosed(item, now)).map(
      (item) => item.id,
    ),
    [2, 4, 1, 3],
  );
  assert.deepEqual(
    items.map((item) => item.id),
    [1, 2, 3, 4],
  );
  assert.equal(
    isBalanceClosed(
      { contentType: "DEBATE", closesAt: new Date(now).toISOString() },
      now,
    ),
    true,
  );
});

for (const [app, tabsFor] of [
  ["mobile", mobileTabs],
  ["web", webTabs],
]) {
  test(`${app}: 예정 경기는 늘, 라이브·종료는 예측이 있을 때만 예측/프리뷰가 첫 탭이다`, () => {
    /* 예정 경기는 프리뷰 재료가 있어 요약 유무와 무관하게 통합 탭이 선다 (KAN-709) */
    assert.equal(tabsFor("SCHEDULED", true)[0], "prediction");
    assert.deepEqual(tabsFor("SCHEDULED", false), tabsFor("SCHEDULED", true));
    assert.ok(!tabsFor("SCHEDULED", true).includes("preview"));
    for (const status of ["LIVE", "FINISHED"]) {
      assert.equal(tabsFor(status, true)[0], "prediction");
      assert.ok(!tabsFor(status, false).includes("prediction"));
      assert.deepEqual(tabsFor(status, true).slice(1), tabsFor(status, false));
    }
    assert.deepEqual(tabsFor("CANCELLED", true), []);
    assert.deepEqual(tabsFor("POSTPONED", true), []);
  });
}

test("예측 목록 오류는 홈으로 대체하지 않고 원래 상태와 코드를 전달한다", async (t) => {
  const requests = [];
  let status = 404;
  t.mock.method(globalThis, "fetch", async (url) => {
    requests.push(String(url));
    return new Response(
      JSON.stringify({
        code: "FEED_UNAVAILABLE",
        message: "unavailable",
        data: null,
      }),
      { status },
    );
  });
  for (status of [404, 401, 500]) {
    requests.length = 0;
    await assert.rejects(getPredictionFeed(), {
      status,
      code: "FEED_UNAVAILABLE",
    });
    assert.equal(requests.length, 1);
    assert.match(requests[0], /predictions\?size=20$/);
  }
  status = 404;
  requests.length = 0;
  await assert.rejects(getPredictionFeed("cursor+&"), { status: 404 });
  assert.equal(requests.length, 1);
  assert.match(requests[0], /cursor=cursor%2B%26/);
});

test("예측 목록 커서는 응답 그대로 다음 요청에 전달할 수 있다", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(
        JSON.stringify({
          code: "OK",
          data: { items: [], nextCursor: "page-2" },
        }),
        { status: 200 },
      ),
  );
  assert.deepEqual(await getPredictionFeed(), {
    items: [],
    nextCursor: "page-2",
  });
});

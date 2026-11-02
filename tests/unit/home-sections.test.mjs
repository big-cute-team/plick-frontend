import { test } from "node:test";
import assert from "node:assert/strict";
import { homeTickerMatches } from "../../packages/domain/src/home.ts";
import { participationDeadline } from "../../packages/domain/src/vs.ts";
import { getHomeTrends } from "../../packages/core/src/home-trends.ts";

test("홈 경기 순환은 라이브만 순서대로 보여주고 없으면 예정 경기를 먼저 둔다", () => {
  const matches = [
    { id: 1, status: "FINISHED" },
    { id: 2, status: "LIVE" },
    { id: 3, status: "SCHEDULED" },
    { id: 4, status: "LIVE" },
    { id: 5, status: "CANCELLED" },
    { id: 6, status: "POSTPONED" },
  ];
  assert.deepEqual(
    homeTickerMatches(matches).map((m) => m.id),
    [2, 4],
  );
  assert.deepEqual(
    homeTickerMatches(matches.filter((m) => m.status !== "LIVE")).map(
      (m) => m.id,
    ),
    [3, 1],
  );
  assert.deepEqual(homeTickerMatches([]), []);
  assert.deepEqual(
    matches.map((m) => m.id),
    [1, 2, 3, 4, 5, 6],
  );
});

test("참여 카드 남은 시간은 마감 경계와 잘못된 날짜를 처리한다", () => {
  const now = Date.parse("2026-11-02T00:00:00Z");
  assert.equal(participationDeadline("bad-date", now), null);
  assert.equal(participationDeadline(new Date(now).toISOString(), now), "마감");
  assert.equal(
    participationDeadline(new Date(now + 1000).toISOString(), now),
    "1분 후 마감",
  );
  assert.equal(
    participationDeadline(new Date(now + 3600000).toISOString(), now),
    "1시간 후 마감",
  );
  assert.equal(
    participationDeadline(new Date(now + 86400000).toISOString(), now),
    "1일 후 마감",
  );
});

test("실검은 STORY 미지원 400만 TEAM으로 대체하며 404와 서버 장애는 숨기지 않는다", async (t) => {
  let status = 400;
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    requests.push(String(url));
    return String(url).includes("type=TEAM")
      ? new Response(
          JSON.stringify({
            code: "OK",
            data: { collectedAt: null, items: [] },
          }),
        )
      : new Response(JSON.stringify({ code: "ERROR", message: "failure" }), {
          status,
        });
  });
  assert.equal((await getHomeTrends()).type, "TEAM");
  assert.equal(requests.length, 2);
  for (status of [404, 500]) {
    requests.length = 0;
    await assert.rejects(getHomeTrends(), { status });
    assert.equal(requests.length, 1);
  }
});

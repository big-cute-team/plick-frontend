/**
 * @file AI 경기 브리핑 fetcher 테스트 (KAN-724). `fetch`를 stub해 READY, UNAVAILABLE, 404, 401, 500,
 * 어긋난 payload, 경기 id가 다른 응답이 각각 어떻게 접히는지 본다. 4xx와 모양 오류는 null, 5xx는 던진다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ApiError } from "../../packages/core/src/client.ts";
import { getMatchBriefing } from "../../packages/core/src/match-briefings.ts";

const BRIEFING = {
  matchId: "900002",
  generatedAt: "2026-11-04T03:01:00Z",
  dataAsOf: "2026-11-04T03:00:00Z",
  expiresAt: "2026-11-05T03:00:00Z",
  points: [{ text: "핵심 문장", evidenceIds: ["article:100"] }],
  cautions: [],
  sources: [
    {
      id: "article:100",
      kind: "ARTICLE",
      title: "경기 전 감독 인터뷰",
      articleId: "100",
      matchId: null,
      observedAt: "2026-11-04T03:00:00Z",
    },
  ],
};

function stubFetch(status, data, code = "OK") {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response(
      JSON.stringify({ code, message: code === "OK" ? null : "실패", data }),
      { status, headers: { "Content-Type": "application/json" } },
    );
  };
  return {
    calls,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

test("READY면 검증을 거친 브리핑을 돌려주고 no-store로 부른다", async () => {
  const stub = stubFetch(200, { status: "READY", briefing: BRIEFING });
  try {
    const briefing = await getMatchBriefing(900002);
    assert.equal(briefing?.matchId, "900002");
    assert.equal(
      stub.calls[0].url,
      "http://localhost:8080/api/v1/matches/900002/briefing",
    );
    assert.equal(stub.calls[0].init.cache, "no-store");
    assert.equal(stub.calls[0].init.next, undefined);
  } finally {
    stub.restore();
  }
});

test("UNAVAILABLE은 null이다", async () => {
  const stub = stubFetch(200, { status: "UNAVAILABLE", briefing: null });
  try {
    assert.equal(await getMatchBriefing(900002), null);
  } finally {
    stub.restore();
  }
});

test("READY인데 briefing이 비었거나 경기 id가 다르면 null이다", async () => {
  let stub = stubFetch(200, { status: "READY", briefing: null });
  try {
    assert.equal(await getMatchBriefing(900002), null);
  } finally {
    stub.restore();
  }
  stub = stubFetch(200, { status: "READY", briefing: BRIEFING });
  try {
    assert.equal(await getMatchBriefing(900003), null);
  } finally {
    stub.restore();
  }
});

test("404와 401 같은 4xx는 null로 접는다", async () => {
  for (const [status, code] of [
    [404, "MATCH_NOT_FOUND"],
    [401, "AUTH_REQUIRED"],
  ]) {
    const stub = stubFetch(status, null, code);
    try {
      assert.equal(await getMatchBriefing(900002), null);
    } finally {
      stub.restore();
    }
  }
});

test("5xx는 ApiError로 던진다(훅이 throwOnError false로 받아 숨긴다)", async () => {
  const stub = stubFetch(500, null, "COMMON_INTERNAL_ERROR");
  try {
    await assert.rejects(getMatchBriefing(900002), (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 500);
      return true;
    });
  } finally {
    stub.restore();
  }
});

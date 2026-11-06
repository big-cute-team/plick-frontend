/**
 * @file 사이트맵 재료 수집 테스트 (KAN-738). `fetch`를 stub해 기사 커서 페이징이 끝까지 걷는지,
 * 상한에서 자르는지, BE가 중간에 죽어도 모은 데까지 돌려주는지, 팀 여섯의 경기 id를 중복 없이
 * 모으고 한 팀이 실패해도 나머지가 남는지 본다. 둘 다 던지지 않는 게 계약이다. 끝에서는 두 앱
 * `sitemap.ts`를 직접 불러 기사와 경기 URL이 실리고 릴 딥링크는 빠지는지, 깨진 발행 시각이
 * lastModified 없이 나가는지, BE가 죽어도 정적 라우트는 나가는지 본다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  collectSitemapArticles,
  collectSitemapMatchIds,
} from "../../packages/core/src/sitemap.ts";

function ok(data) {
  return new Response(JSON.stringify({ code: "OK", message: null, data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function fail(status) {
  return new Response(
    JSON.stringify({ code: "COMMON_ERROR", message: "실패", data: null }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

/** `handler(url)`가 Response를 돌려주는 fetch stub. console.error·warn은 조용히 모은다. */
function stub(handler) {
  const original = {
    fetch: globalThis.fetch,
    error: console.error,
    warn: console.warn,
  };
  const calls = [];
  const logs = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return handler(new URL(String(url)));
  };
  console.error = (...args) => logs.push(args.join(" "));
  console.warn = (...args) => logs.push(args.join(" "));
  return {
    calls,
    logs,
    restore: () => {
      globalThis.fetch = original.fetch;
      console.error = original.error;
      console.warn = original.warn;
    },
  };
}

function card(id) {
  return {
    articleSummaryId: id,
    title: `기사 ${id}`,
    summary: "요약",
    rumorStage: null,
    contentType: "GENERAL",
    publishedAt: `2026-11-0${(id % 9) + 1}T00:00:00Z`,
    mainImageUrl: null,
    detailImageUrl: null,
    teams: [],
    logoUrl: null,
    reporter: null,
    sourceUrl: null,
    likeCount: 0,
    commentCount: 0,
    viewCount: 0,
    likedByMe: false,
    hashtags: [],
  };
}

/** 커서가 "p2", "p3"로 이어지는 세 페이지짜리 기사 목록. */
function articlePages(url) {
  const cursor = url.searchParams.get("cursor");
  if (!cursor) return ok({ items: [card(1), card(2)], nextCursor: "p2" });
  if (cursor === "p2")
    return ok({ items: [card(3), card(4)], nextCursor: "p3" });
  return ok({ items: [card(5)], nextCursor: null });
}

function fixture(matchId) {
  const side = { id: 1, name: "팀", logo: null };
  return {
    matchId,
    league: { id: 39, name: "프리미어리그", logo: null },
    round: null,
    kickoffAt: "2026-11-08T12:00:00+09:00",
    status: "SCHEDULED",
    isHome: true,
    home: side,
    away: side,
    score: { home: null, away: null },
    result: null,
  };
}

test("기사는 커서가 끝날 때까지 걸어 id와 발행 시각을 최신순 그대로 모은다", async () => {
  const s = stub(articlePages);
  try {
    const articles = await collectSitemapArticles();
    assert.deepEqual(
      articles.map((a) => a.id),
      ["1", "2", "3", "4", "5"],
    );
    assert.equal(
      articles[0].publishedAt.toISOString(),
      new Date(card(1).publishedAt).toISOString(),
    );
    assert.equal(s.calls.length, 3);
    assert.ok(s.calls.every((url) => url.includes("size=30")));
    assert.equal(s.logs.length, 0);
  } finally {
    s.restore();
  }
});

test("상한에 닿으면 거기서 자르고 잘렸다고 로그를 남긴다", async () => {
  const s = stub(articlePages);
  try {
    const articles = await collectSitemapArticles(3);
    assert.equal(articles.length, 3);
    assert.equal(s.calls.length, 2);
    assert.ok(s.logs.some((line) => line.includes("상한(3)")));
  } finally {
    s.restore();
  }
});

test("BE가 중간에 죽으면 던지지 않고 모은 데까지만 돌려준다", async () => {
  const s = stub((url) =>
    url.searchParams.get("cursor") ? fail(500) : articlePages(url),
  );
  try {
    const articles = await collectSitemapArticles();
    assert.deepEqual(
      articles.map((a) => a.id),
      ["1", "2"],
    );
    assert.ok(s.logs.some((line) => line.includes("기사 목록 로드 실패")));
  } finally {
    s.restore();
  }
});

test("발행 시각을 날짜로 못 읽는 기사는 버리지 않고 시각만 null로 둔다", async () => {
  const s = stub(() =>
    ok({
      items: [{ ...card(1), publishedAt: "어제" }, card(2)],
      nextCursor: null,
    }),
  );
  try {
    const articles = await collectSitemapArticles();
    assert.equal(articles.length, 2);
    assert.equal(articles[0].publishedAt, null);
    assert.ok(articles[1].publishedAt instanceof Date);
  } finally {
    s.restore();
  }
});

test("첫 페이지부터 실패하면 빈 배열이다", async () => {
  const s = stub(() => fail(502));
  try {
    assert.deepEqual(await collectSitemapArticles(), []);
  } finally {
    s.restore();
  }
});

test("경기는 팀 여섯의 예정과 종료를 합쳐 중복 없이 모은다", async () => {
  const s = stub((url) => {
    const teamId = Number(url.pathname.match(/teams\/(\d+)\/fixtures/)[1]);
    // 100은 모든 팀 목록에 있는 경기(빅6 맞대결 흉내), 나머지는 팀마다 다르다
    return ok({
      upcoming: [fixture(100), fixture(1000 + teamId)],
      results: [fixture(2000 + teamId)],
    });
  });
  try {
    const ids = await collectSitemapMatchIds();
    assert.equal(s.calls.length, 6);
    assert.equal(ids.length, 13);
    assert.equal(new Set(ids).size, 13);
    assert.ok(ids.includes(100));
  } finally {
    s.restore();
  }
});

test("한 팀이 실패해도 나머지 팀 경기는 남고, 전부 실패하면 빈 배열이다", async () => {
  let first = true;
  const s = stub((url) => {
    if (first) {
      first = false;
      return fail(502);
    }
    const teamId = Number(url.pathname.match(/teams\/(\d+)\/fixtures/)[1]);
    return ok({ upcoming: [fixture(teamId)], results: [] });
  });
  try {
    const ids = await collectSitemapMatchIds();
    assert.equal(ids.length, 5);
    assert.ok(s.logs.some((line) => line.includes("시즌 경기 로드 실패")));
  } finally {
    s.restore();
  }

  const all = stub(() => fail(502));
  try {
    assert.deepEqual(await collectSitemapMatchIds(), []);
  } finally {
    all.restore();
  }
});

/** 기사 두 건(하나는 발행 시각이 깨짐)과 팀마다 경기 한 건을 주는 BE 흉내. */
function siteBackend(url) {
  if (url.pathname.endsWith("/fixtures")) {
    return ok({ upcoming: [fixture(100)], results: [] });
  }
  return ok({
    items: [card(1), { ...card(2), publishedAt: "어제" }],
    nextCursor: null,
  });
}

for (const app of ["web", "mobile"]) {
  test(`${app} 사이트맵은 기사와 경기 상세를 싣고 릴 딥링크는 싣지 않는다`, async () => {
    const { default: sitemap } = await import(
      `../../apps/${app}/app/sitemap.ts`
    );
    const s = stub(siteBackend);
    try {
      const entries = await sitemap();
      const paths = entries.map((entry) => new URL(entry.url).pathname);
      for (const path of [
        "/",
        "/live",
        "/debates",
        "/articles/1",
        "/articles/2",
        "/live/matches/100",
      ]) {
        assert.ok(paths.includes(path), path);
      }
      assert.ok(!paths.some((path) => /^\/reels\/\d/.test(path)));
      assert.ok(!paths.some((path) => path.startsWith("/me")));
      assert.equal(new Set(paths).size, paths.length);

      const byPath = Object.fromEntries(
        entries.map((entry) => [new URL(entry.url).pathname, entry]),
      );
      assert.ok(byPath["/articles/1"].lastModified instanceof Date);
      assert.equal("lastModified" in byPath["/articles/2"], false);
      assert.equal("lastModified" in byPath["/live/matches/100"], false);
    } finally {
      s.restore();
    }
  });

  test(`${app} 사이트맵은 BE가 죽어도 정적 라우트만으로 응답한다`, async () => {
    const { default: sitemap } = await import(
      `../../apps/${app}/app/sitemap.ts`
    );
    const s = stub(() => fail(502));
    try {
      const paths = (await sitemap()).map((e) => new URL(e.url).pathname);
      assert.ok(paths.includes("/"));
      assert.ok(paths.includes("/teams/liverpool"));
      assert.ok(!paths.some((path) => path.startsWith("/articles/")));
    } finally {
      s.restore();
    }
  });
}

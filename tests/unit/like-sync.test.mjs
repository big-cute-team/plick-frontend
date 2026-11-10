/**
 * @file 좋아요를 피드 캐시에 옮겨 붙이는 `syncLikeIntoFeeds` 테스트 (KAN-748).
 *
 * `articles` 상위 키 아래에는 무한 목록이 아닌 엔트리도 산다. 경기 뉴스는 카드 배열이고 기사 상세는
 * 객체 하나다. 무한 목록으로 단정하고 `pages`를 돌던 때에는 그런 엔트리가 캐시에 있으면 예외가 나
 * 좋아요가 통째로 무산됐다(웹 릴스는 세부 패널이 기사 상세를 받아 늘 그랬다). 실제 QueryClient로 본다.
 */
import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { activityKeys } from "../../packages/core/src/activityKeys.ts";
import { clearRecentArticleStateEdits } from "../../packages/core/src/article-state-cache.ts";
import { articleKeys } from "../../packages/core/src/articleKeys.ts";
import { clearRecentFeedEdits } from "../../packages/core/src/feed-recent-edits.ts";
import { syncLikeIntoFeeds } from "../../packages/core/src/like-sync.ts";
import { reelKeys } from "../../packages/core/src/reelKeys.ts";

/* 루트에는 없고 core가 의존하는 패키지라 core 자리에서 찾는다 */
const { QueryClient } = createRequire(
  new URL("../../packages/core/package.json", import.meta.url),
)("@tanstack/react-query");

function newClient() {
  return new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity, retry: false } },
  });
}

const feed = (items) => ({
  pages: [{ items, nextCursor: null }],
  pageParams: [null],
});
const next = { liked: true, likeCount: 11 };

beforeEach(() => {
  clearRecentArticleStateEdits();
  clearRecentFeedEdits();
});

test("기사 상세나 경기 뉴스 캐시가 같이 있어도 예외 없이 피드 카드를 고친다", () => {
  const client = newClient();
  client.setQueryData(
    reelKeys.feed(),
    feed([
      { id: "1", liked: false, likeCount: 10 },
      { id: "2", liked: false, likeCount: 3 },
    ]),
  );
  client.setQueryData(
    articleKeys.feed("ALL"),
    feed([{ id: "1", liked: false, likeCount: 10 }]),
  );
  /* 웹 릴 세부 패널이 기자 목록 때문에 받는 기사 상세. 객체 하나다 */
  client.setQueryData(articleKeys.detail("1"), { id: "1", reporters: [] });
  /* 경기 뉴스는 카드 배열이다 */
  client.setQueryData(articleKeys.matchNews(["ARS", "CHE"]), [
    { id: "1", liked: false, likeCount: 10 },
    { id: "9", liked: false, likeCount: 1 },
  ]);
  client.setQueryData(
    activityKeys.likes(),
    feed([{ id: "1", liked: false, likeCount: 10 }]),
  );

  assert.doesNotThrow(() => syncLikeIntoFeeds(client, "1", next));

  assert.deepEqual(client.getQueryData(reelKeys.feed()).pages[0].items, [
    { id: "1", ...next },
    { id: "2", liked: false, likeCount: 3 },
  ]);
  assert.deepEqual(
    client.getQueryData(articleKeys.feed("ALL")).pages[0].items[0],
    {
      id: "1",
      ...next,
    },
  );
  assert.deepEqual(
    client.getQueryData(activityKeys.likes()).pages[0].items[0],
    {
      id: "1",
      ...next,
    },
  );
  assert.deepEqual(client.getQueryData(articleKeys.matchNews(["ARS", "CHE"])), [
    { id: "1", ...next },
    { id: "9", liked: false, likeCount: 1 },
  ]);
  /* 카드가 아닌 엔트리는 그대로 둔다 */
  assert.deepEqual(client.getQueryData(articleKeys.detail("1")), {
    id: "1",
    reporters: [],
  });
});

test("아직 못 받은 엔트리(데이터 없음)와 모양이 다른 페이지는 건드리지 않는다", async () => {
  const client = newClient();
  /* 조회가 도는 중이라 데이터가 없는 엔트리 */
  const pending = client.fetchQuery({
    queryKey: articleKeys.detail("7"),
    queryFn: () => new Promise(() => {}),
  });
  pending.catch(() => {});
  client.setQueryData(articleKeys.storyFeed("s"), {
    pages: [{ nextCursor: null }],
    pageParams: [null],
  });

  assert.doesNotThrow(() => syncLikeIntoFeeds(client, "7", next));
  assert.equal(client.getQueryData(articleKeys.detail("7")), undefined);
  assert.deepEqual(client.getQueryData(articleKeys.storyFeed("s")).pages, [
    { nextCursor: null },
  ]);
  await client.cancelQueries();
});

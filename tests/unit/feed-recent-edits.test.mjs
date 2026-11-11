/**
 * @file 방금 누른 좋아요 수와 투표 집계를 릴스 피드 응답 위에 지키는지 본다 (KAN-748).
 *
 * 씨앗이 묵어 피드를 다시 받는 중에 누르면, 누르기 전에 나간 요청이 옛 수를 싣고 돌아와 캐시를
 * 바꾼다. 실제 QueryClient의 무한 쿼리로 "도는 중이던 조회가 끝나며 캐시를 덮는다"를 재현한다.
 */
import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  clearRecentArticleStateEdits,
  RECENT_EDIT_MS,
} from "../../packages/core/src/article-state-cache.ts";
import { syncDebateVote } from "../../packages/core/src/debate-sync.ts";
import {
  clearRecentFeedEdits,
  forgetLikeCount,
  forgetVoteCounts,
  loadFeedKeepingRecentEdits,
} from "../../packages/core/src/feed-recent-edits.ts";
import { syncLikeIntoFeeds } from "../../packages/core/src/like-sync.ts";
import { reelKeys } from "../../packages/core/src/reelKeys.ts";

const { QueryClient } = createRequire(
  new URL("../../packages/core/package.json", import.meta.url),
)("@tanstack/react-query");

function newClient() {
  return new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity, retry: false } },
  });
}

const page = (items) => ({ items, nextCursor: null });
const reel = (likeCount, votes) => ({
  id: "1",
  liked: false,
  likeCount,
  debate: votes ? { id: "d1", myVote: null, ...votes } : null,
});

/** 묵은 씨앗이 든 릴스 피드를 심는다 */
function seed(client, item) {
  client.setQueryData(reelKeys.feed(), {
    pages: [page([item])],
    pageParams: [null],
  });
}

/** 앱의 `useReelsFeed`와 같은 모양으로 피드를 다시 받는다. `answer`를 부를 때까지 도는 중이다 */
function refetchFeed(client) {
  let answer;
  const held = new Promise((resolve) => {
    answer = resolve;
  });
  const fetching = client.fetchInfiniteQuery({
    queryKey: reelKeys.feed(),
    queryFn: () => loadFeedKeepingRecentEdits(() => held),
    initialPageParam: null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 0,
  });
  return { fetching, answer };
}

const firstItem = (client) =>
  client.getQueryData(reelKeys.feed()).pages[0].items[0];

beforeEach(() => {
  clearRecentArticleStateEdits();
  clearRecentFeedEdits();
});

test("피드를 다시 받는 중에 누른 좋아요 수는 늦게 온 응답에 안 덮인다", async () => {
  const client = newClient();
  seed(client, reel(10));
  const { fetching, answer } = refetchFeed(client);

  syncLikeIntoFeeds(client, "1", { liked: true, likeCount: 11 });
  assert.equal(firstItem(client).likeCount, 11);

  /* 누르기 전에 나간 요청이라 옛 수가 온다 */
  answer(page([reel(10)]));
  await fetching;
  assert.equal(firstItem(client).likeCount, 11);
});

test("액션이 먼저 끝나 확정 수를 적은 뒤에 옛 응답이 와도 확정 수가 남는다", async () => {
  const client = newClient();
  seed(client, reel(10));
  const { fetching, answer } = refetchFeed(client);

  syncLikeIntoFeeds(client, "1", { liked: true, likeCount: 11 });
  /* 그 사이 다른 사람도 눌러 BE 확정 수는 13이다 */
  syncLikeIntoFeeds(client, "1", { liked: true, likeCount: 13 });
  answer(page([reel(12)]));
  await fetching;

  assert.equal(firstItem(client).likeCount, 13);
});

test("누르지 않은 카드와 누르지 않은 필드는 응답 값을 받는다", async () => {
  const client = newClient();
  seed(client, reel(10));
  const { fetching, answer } = refetchFeed(client);

  syncLikeIntoFeeds(client, "1", { liked: true, likeCount: 11 });
  answer(
    page([
      { ...reel(10), title: "새 제목" },
      { id: "2", liked: false, likeCount: 5, debate: null },
    ]),
  );
  await fetching;

  const items = client.getQueryData(reelKeys.feed()).pages[0].items;
  assert.equal(items[0].title, "새 제목");
  assert.equal(items[0].likeCount, 11);
  assert.deepEqual(items[1], {
    id: "2",
    liked: false,
    likeCount: 5,
    debate: null,
  });
});

test("누른 지 오래된 수는 응답이 이긴다", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: 1_000_000 });
  const client = newClient();
  seed(client, reel(10));
  syncLikeIntoFeeds(client, "1", { liked: true, likeCount: 11 });

  t.mock.timers.tick(RECENT_EDIT_MS + 1);
  const { fetching, answer } = refetchFeed(client);
  answer(page([reel(20)]));
  await fetching;

  assert.equal(firstItem(client).likeCount, 20);
});

test("누른 직후에 출발한 조회가 옛 수를 받아 와도 방금 수가 남는다", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: 1_000_000 });
  const client = newClient();
  seed(client, reel(10));
  syncLikeIntoFeeds(client, "1", { liked: true, likeCount: 11 });

  /* 액션이 BE에 닿기 전에 출발한 조회 */
  t.mock.timers.tick(200);
  const { fetching, answer } = refetchFeed(client);
  answer(page([reel(10)]));
  await fetching;

  assert.equal(firstItem(client).likeCount, 11);
});

test("실패해 되돌린 뒤에는 기억을 지워 응답 값을 받는다", async () => {
  const client = newClient();
  seed(client, reel(10));
  const { fetching, answer } = refetchFeed(client);

  syncLikeIntoFeeds(client, "1", { liked: true, likeCount: 11 });
  /* 롤백: 누르기 전 값을 되적고 기억을 지운다 (`useArticleLike`의 onRollback) */
  syncLikeIntoFeeds(client, "1", { liked: false, likeCount: 10 });
  forgetLikeCount("1");

  answer(page([reel(14)]));
  await fetching;
  assert.equal(firstItem(client).likeCount, 14);
});

test("피드를 다시 받는 중에 한 투표의 집계도 지킨다. 내 표는 응답 값을 그대로 둔다", async () => {
  const client = newClient();
  seed(client, reel(10, { voteCountA: 3, voteCountB: 4 }));
  const { fetching, answer } = refetchFeed(client);

  syncDebateVote(client, "d1", {
    voteCountA: 4,
    voteCountB: 4,
    myVote: "OPTION_A",
  });
  answer(page([reel(10, { voteCountA: 3, voteCountB: 4 })]));
  await fetching;

  assert.deepEqual(firstItem(client).debate, {
    id: "d1",
    myVote: null,
    voteCountA: 4,
    voteCountB: 4,
  });
  /* 누르지 않은 좋아요 수는 응답 값이다 */
  assert.equal(firstItem(client).likeCount, 10);
});

test("투표가 실패해 되돌린 뒤에는 집계 기억을 지운다", async () => {
  const client = newClient();
  seed(client, reel(10, { voteCountA: 3, voteCountB: 4 }));
  const { fetching, answer } = refetchFeed(client);

  syncDebateVote(client, "d1", {
    voteCountA: 4,
    voteCountB: 4,
    myVote: "OPTION_A",
  });
  syncDebateVote(client, "d1", { voteCountA: 3, voteCountB: 4, myVote: null });
  forgetVoteCounts("d1");

  answer(page([reel(10, { voteCountA: 8, voteCountB: 9 })]));
  await fetching;
  assert.deepEqual(firstItem(client).debate, {
    id: "d1",
    myVote: null,
    voteCountA: 8,
    voteCountB: 9,
  });
});

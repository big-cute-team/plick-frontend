/**
 * @file 내 기사 상태 캐시 쓰기 테스트 (KAN-748). 페이지를 연 직후처럼 조회가 도는 중에 누른 값이
 * 늦게 온 응답에 덮이지 않는지, 누르지 않은 쪽 필드는 응답 값을 받는지를 실제 QueryClient로 본다.
 * 가짜 클라이언트로는 "진행 중이던 조회가 끝나며 캐시를 덮는다"는 경합 자체가 재현되지 않는다.
 */
import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  clearRecentArticleStateEdits,
  loadMyArticleState,
  RECENT_EDIT_MS,
  refreshMyArticleState,
  setMyArticleState,
} from "../../packages/core/src/article-state-cache.ts";
import { articleStateKeys } from "../../packages/core/src/articleStateKeys.ts";

/* 루트에는 없고 core가 의존하는 패키지라 core 자리에서 찾는다 */
const { QueryClient } = createRequire(
  new URL("../../packages/core/package.json", import.meta.url),
)("@tanstack/react-query");

/** gcTime을 무한으로 둬 테스트가 끝난 뒤 타이머가 프로세스를 붙잡지 않게 한다 */
function newClient() {
  return new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity, retry: false } },
  });
}

/** 응답 시점을 테스트가 정하는 로더. `answer`를 부를 때까지 조회가 도는 중이다 */
function heldLoader() {
  let answer;
  const pending = new Promise((resolve) => {
    answer = resolve;
  });
  return { loader: { load: () => pending }, answer };
}

/** 앱의 `useMyArticleState`가 거는 조회와 같은 모양 */
function fetchState(client, loader, id) {
  return client.fetchQuery({
    queryKey: articleStateKeys.byId(id),
    queryFn: () => loadMyArticleState(loader, id),
    staleTime: Infinity,
  });
}

beforeEach(() => clearRecentArticleStateEdits());

test("조회가 도는 중에 누른 좋아요는 늦게 온 응답에 안 덮이고, 누르지 않은 투표는 응답 값을 받는다", async () => {
  const client = newClient();
  const { loader, answer } = heldLoader();
  const fetching = fetchState(client, loader, "1");

  setMyArticleState(client, "1", { liked: true });
  assert.deepEqual(client.getQueryData(articleStateKeys.byId("1")), {
    liked: true,
    vote: null,
  });

  answer({ liked: false, vote: "OPTION_A" });
  await fetching;
  assert.deepEqual(client.getQueryData(articleStateKeys.byId("1")), {
    liked: true,
    vote: "OPTION_A",
  });
});

test("액션이 먼저 끝나 확정 값까지 적은 뒤에 옛 응답이 와도 하트가 남는다", async () => {
  const client = newClient();
  const { loader, answer } = heldLoader();
  const fetching = fetchState(client, loader, "2");

  setMyArticleState(client, "2", { liked: true });
  setMyArticleState(client, "2", { liked: true });
  answer({ liked: false, vote: null });
  await fetching;

  assert.equal(client.getQueryData(articleStateKeys.byId("2")).liked, true);
});

test("조회가 도는 중에 한 투표도 같은 길로 지킨다", async () => {
  const client = newClient();
  const { loader, answer } = heldLoader();
  const fetching = fetchState(client, loader, "3");

  setMyArticleState(client, "3", { vote: "OPTION_B" });
  answer({ liked: true, vote: null });
  await fetching;

  assert.deepEqual(client.getQueryData(articleStateKeys.byId("3")), {
    liked: true,
    vote: "OPTION_B",
  });
});

test("세션이 없어 조회가 없을 때 눌러도 캐시에 적고, 모르는 필드가 있어 무효로 표시한다", () => {
  const client = newClient();
  const key = articleStateKeys.byId("4");

  setMyArticleState(client, "4", { liked: true });

  assert.deepEqual(client.getQueryData(key), { liked: true, vote: null });
  assert.equal(client.getQueryState(key).isInvalidated, true);
});

test("무효 표시는 같은 값을 다시 적으면 걷힌다(새 게스트를 받을 때 AuthProvider가 쓰는 길)", () => {
  const client = newClient();
  const key = articleStateKeys.byId("5");
  setMyArticleState(client, "5", { liked: true });

  client.setQueryData(key, client.getQueryData(key));

  assert.equal(client.getQueryState(key).isInvalidated, false);
  assert.equal(client.getQueryData(key).liked, true);
});

test("캐시에 서버 값이 있으면 그 위에 덮고 무효로 표시하지 않는다", () => {
  const client = newClient();
  const key = articleStateKeys.byId("6");
  client.setQueryData(key, { liked: false, vote: "OPTION_A" });

  setMyArticleState(client, "6", { liked: true });

  assert.deepEqual(client.getQueryData(key), { liked: true, vote: "OPTION_A" });
  assert.equal(client.getQueryState(key).isInvalidated, false);
});

test("빈 캐시에 적은 기사는 다음에 물을 때 누르지 않은 필드를 서버 값으로 채운다", async () => {
  const client = newClient();
  setMyArticleState(client, "7", { liked: false });

  const { loader, answer } = heldLoader();
  const fetching = fetchState(client, loader, "7");
  answer({ liked: false, vote: "OPTION_B" });
  await fetching;

  assert.deepEqual(client.getQueryData(articleStateKeys.byId("7")), {
    liked: false,
    vote: "OPTION_B",
  });
});

test("오래전에 누른 기록은 응답을 덮지 않는다(다른 기기에서 바꾼 값이 이긴다)", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: 1_000_000 });
  const client = newClient();
  setMyArticleState(client, "8", { liked: true });

  t.mock.timers.setTime(1_000_000 + RECENT_EDIT_MS + 1);
  const { loader, answer } = heldLoader();
  const fetching = fetchState(client, loader, "8");
  answer({ liked: false, vote: null });
  await fetching;

  assert.equal(client.getQueryData(articleStateKeys.byId("8")).liked, false);
});

test("누른 직후에 출발한 조회가 액션보다 먼저 BE에 닿아 옛 값을 받아 와도 안 덮인다", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: 2_000_000 });
  const client = newClient();
  setMyArticleState(client, "9", { liked: true });

  t.mock.timers.setTime(2_000_000 + 500);
  const { loader, answer } = heldLoader();
  const fetching = fetchState(client, loader, "9");
  answer({ liked: false, vote: null });
  await fetching;

  assert.equal(client.getQueryData(articleStateKeys.byId("9")).liked, true);
});

test("실패해 되돌린 필드는 기록을 지워 서버 값이 들어오게 한다", async () => {
  const client = newClient();
  const { loader, answer } = heldLoader();
  const fetching = fetchState(client, loader, "10");

  /* 조회가 끝나기 전이라 화면은 "안 누름"으로 알고 눌렀고, 액션이 실패해 그 값으로 되돌렸다 */
  setMyArticleState(client, "10", { liked: true });
  setMyArticleState(client, "10", { liked: false });
  refreshMyArticleState(client, "10", ["liked"]);

  /* 서버는 원래 눌린 상태였다(다른 기기에서 누름) */
  answer({ liked: true, vote: null });
  await fetching;

  assert.equal(client.getQueryData(articleStateKeys.byId("10")).liked, true);
});

test("되돌리지 않은 필드의 기록은 남긴다", async () => {
  const client = newClient();
  const { loader, answer } = heldLoader();
  const fetching = fetchState(client, loader, "11");

  setMyArticleState(client, "11", { liked: true });
  setMyArticleState(client, "11", { vote: "OPTION_A" });
  setMyArticleState(client, "11", { vote: null });
  refreshMyArticleState(client, "11", ["vote"]);

  answer({ liked: false, vote: "OPTION_B" });
  await fetching;

  assert.deepEqual(client.getQueryData(articleStateKeys.byId("11")), {
    liked: true,
    vote: "OPTION_B",
  });
});

test("세션이 바뀌어 기록을 지우면 응답이 그대로 들어온다", async () => {
  const client = newClient();
  const { loader, answer } = heldLoader();
  const fetching = fetchState(client, loader, "12");

  setMyArticleState(client, "12", { liked: true });
  clearRecentArticleStateEdits();
  answer({ liked: false, vote: null });
  await fetching;

  assert.equal(client.getQueryData(articleStateKeys.byId("12")).liked, false);
});

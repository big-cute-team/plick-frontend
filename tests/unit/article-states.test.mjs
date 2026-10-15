/**
 * @file 내 기사 상태 일괄 조회 테스트 (KAN-664). BE 상한(60개)에 맞춘 나누기와 거절될 id
 * 거르기, 같은 순간에 들어온 단건 조회를 한 번으로 묶는 로더를 본다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chunkArticleIds,
  createArticleStateLoader,
  DEFAULT_ARTICLE_STATE,
} from "../../packages/core/src/article-state-batch.ts";

test("중복과 숫자가 아니거나 0 이하인 id를 걸러 순서대로 나눈다", () => {
  assert.deepEqual(chunkArticleIds(["3", "1", "3", "x", "0", "-2", "2"], 2), [
    ["3", "1"],
    ["2"],
  ]);
});

test("기본 상한은 60개라 61개면 두 묶음이 된다", () => {
  const ids = Array.from({ length: 61 }, (_, i) => String(i + 1));
  const chunks = chunkArticleIds(ids);
  assert.deepEqual(
    chunks.map((c) => c.length),
    [60, 1],
  );
});

test("같은 순간의 load는 한 번의 조회로 묶이고 응답에 없는 id는 기본값이다", async () => {
  const calls = [];
  const loader = createArticleStateLoader(async (ids) => {
    calls.push([...ids]);
    return new Map([["1", { liked: true, vote: "OPTION_A" }]]);
  });

  const [a, b, again] = await Promise.all([
    loader.load("1"),
    loader.load("2"),
    loader.load("1"),
  ]);

  assert.deepEqual(calls, [["1", "2"]]);
  assert.deepEqual(a, { liked: true, vote: "OPTION_A" });
  assert.deepEqual(again, a);
  assert.deepEqual(b, DEFAULT_ARTICLE_STATE);
});

test("창이 지난 뒤의 load는 다음 조회로 나간다", async () => {
  const calls = [];
  const loader = createArticleStateLoader(async (ids) => {
    calls.push([...ids]);
    return new Map();
  });

  await loader.load("1");
  await loader.load("2");
  assert.deepEqual(calls, [["1"], ["2"]]);
});

test("조회가 실패하면 묶인 load가 모두 같은 에러로 거절된다", async () => {
  const loader = createArticleStateLoader(async () => {
    throw new Error("401");
  });
  const results = await Promise.allSettled([
    loader.load("1"),
    loader.load("2"),
  ]);
  assert.deepEqual(
    results.map((r) => r.status),
    ["rejected", "rejected"],
  );
});

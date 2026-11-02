/**
 * @file 쿼리 재시도 정책 테스트 (KAN-685). 4xx는 재시도하지 않고 그 밖만 상한까지 다시 시도하는지 본다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ApiError } from "../../packages/core/src/client.ts";
import {
  FEED_MAX_RETRIES,
  retryUnlessClientError,
} from "../../packages/core/src/query-policy.ts";

test("4xx ApiError는 첫 실패부터 재시도하지 않는다", () => {
  const retry = retryUnlessClientError();
  assert.equal(retry(0, new ApiError(400, "BAD", "bad")), false);
  assert.equal(retry(0, new ApiError(404, "NOT_FOUND", "none")), false);
  assert.equal(retry(0, new ApiError(499, "X", "x")), false);
});

test("5xx와 순단은 상한 직전까지만 재시도한다", () => {
  const retry = retryUnlessClientError();
  assert.equal(retry(0, new ApiError(502, "UPSTREAM", "down")), true);
  assert.equal(
    retry(FEED_MAX_RETRIES - 1, new TypeError("fetch failed")),
    true,
  );
  assert.equal(retry(FEED_MAX_RETRIES, new TypeError("fetch failed")), false);
});

test("상한을 넘기면 그 값을 쓴다", () => {
  const retry = retryUnlessClientError(1);
  assert.equal(retry(0, new Error("x")), true);
  assert.equal(retry(1, new Error("x")), false);
});

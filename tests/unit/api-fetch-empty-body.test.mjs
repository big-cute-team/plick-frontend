/**
 * @file `apiFetch` 빈 본문 회귀 테스트 (KAN-695). 예측 취소와 답글 삭제는 204로 와서 봉투가
 * 없다. 전에는 `res.json()`이 빈 본문에서 던져 성공한 삭제가 네트워크 실패로 보였다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ApiError, apiFetch } from "../../packages/core/src/client.ts";

function stubFetch(status, body) {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(body, {
      status,
      headers: body === null ? {} : { "Content-Type": "application/json" },
    });
  return () => {
    globalThis.fetch = original;
  };
}

test("204 빈 본문은 null로 돌려주고 던지지 않는다", async () => {
  const restore = stubFetch(204, null);
  try {
    assert.equal(
      await apiFetch("/api/v1/matches/1/prediction", { method: "DELETE" }),
      null,
    );
  } finally {
    restore();
  }
});

test("봉투가 있으면 전처럼 data만 벗겨 준다", async () => {
  const restore = stubFetch(
    200,
    JSON.stringify({ code: "OK", message: null, data: { likeCount: 3 } }),
  );
  try {
    assert.deepEqual(await apiFetch("/api/v1/x"), { likeCount: 3 });
  } finally {
    restore();
  }
});

test("실패 봉투는 전처럼 ApiError다", async () => {
  const restore = stubFetch(
    409,
    JSON.stringify({ code: "PREDICTION_CLOSED", message: "마감", data: null }),
  );
  try {
    await assert.rejects(
      apiFetch("/api/v1/x", { method: "PUT" }),
      (e) => e instanceof ApiError && e.code === "PREDICTION_CLOSED",
    );
  } finally {
    restore();
  }
});

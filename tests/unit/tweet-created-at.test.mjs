/**
 * @file 트윗 임베드 작성 시각 포맷(KAN-672). 실행 환경 시간대와 무관하게 KST로 같은 글자가 나와야
 * 서버(UTC)가 그린 임베드를 브라우저가 하이드레이트할 때 #418이 나지 않는다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatTweetCreatedAt } from "../../packages/domain/src/format.ts";

test("UTC 23시는 KST 다음 날 아침으로 그린다", () => {
  assert.equal(
    formatTweetCreatedAt("2026-10-25T23:48:28.000Z"),
    "8:48 AM · Oct 26, 2026",
  );
});

test("react-tweet formatDate와 같은 모양이다 (오후, 한 자리 시)", () => {
  assert.equal(
    formatTweetCreatedAt("2026-01-01T06:05:00.000Z"),
    "3:05 PM · Jan 1, 2026",
  );
});

test("프로세스 시간대가 달라도 결과가 같다", () => {
  const prev = process.env.TZ;
  try {
    process.env.TZ = "America/Los_Angeles";
    const la = formatTweetCreatedAt("2026-10-25T23:48:28.000Z");
    process.env.TZ = "UTC";
    assert.equal(formatTweetCreatedAt("2026-10-25T23:48:28.000Z"), la);
  } finally {
    process.env.TZ = prev;
  }
});

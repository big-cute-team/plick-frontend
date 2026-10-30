/**
 * @file 승부예측 캐시 정리 테스트 (KAN-695). 쓰기 뒤 무효화 범위가 가이드 §8(요약, 의견,
 * 홈, 내 기록)과 맞는지와, 공감 낙관 갱신이 무한 쿼리 페이지의 그 의견만 덮는지 본다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { predictionKeys } from "../../packages/core/src/predictionKeys.ts";
import {
  applyOpinionLike,
  applyReplyLike,
  invalidateAfterPredictionWrite,
  invalidateAfterReplyWrite,
} from "../../packages/core/src/prediction-sync.ts";

function recorder() {
  const keys = [];
  return {
    keys,
    invalidateQueries({ queryKey }) {
      keys.push(queryKey);
      return Promise.resolve();
    },
  };
}

test("예측 쓰기 뒤에는 요약, 그 경기 의견 전체, 홈, 내 기록을 무효화하고 랭킹은 두지 않는다", async () => {
  const qc = recorder();
  await invalidateAfterPredictionWrite(qc, 1208345);
  assert.deepEqual(qc.keys, [
    predictionKeys.summary(1208345),
    predictionKeys.opinionsOf(1208345),
    predictionKeys.home(),
    predictionKeys.mine(),
  ]);
  assert.ok(!qc.keys.some((key) => key[1] === "rankings"));
});

test("의견 상위 키는 정렬·픽 필터별 키의 접두어다", () => {
  const specific = predictionKeys.opinions(7, "latest", "AWAY");
  const prefix = predictionKeys.opinionsOf(7);
  assert.deepEqual(specific.slice(0, prefix.length), prefix);
  assert.equal(predictionKeys.opinions(7, "accuracy", null).at(-1), "ALL");
  assert.deepEqual(predictionKeys.myStats().slice(0, 2), predictionKeys.mine());
});

test("답글 쓰기 뒤에는 답글 목록과 replyCount를 든 의견 캐시를 함께 무효화한다", async () => {
  const qc = recorder();
  await invalidateAfterReplyWrite(qc, 1208345, 1002);
  assert.deepEqual(qc.keys, [
    predictionKeys.replies(1002),
    predictionKeys.opinion(1002),
    predictionKeys.opinionsOf(1208345),
  ]);
});

const page = (items) => ({
  locked: false,
  mine: null,
  items,
  nextCursor: null,
});

test("공감 갱신은 그 의견만 덮고 다른 페이지는 같은 참조를 유지한다", () => {
  const untouched = page([{ id: 1, liked: false, likeCount: 3 }]);
  const data = {
    pages: [untouched, page([{ id: 2, liked: false, likeCount: 10 }])],
    pageParams: [null, "c1"],
  };
  const next = applyOpinionLike(data, 2, { liked: true, likeCount: 11 });
  assert.equal(next.pages[0], untouched);
  assert.deepEqual(next.pages[1].items[0], {
    id: 2,
    liked: true,
    likeCount: 11,
  });
  assert.equal(applyOpinionLike(data, 99, { liked: true, likeCount: 1 }), data);
  assert.equal(
    applyOpinionLike(undefined, 2, { liked: true, likeCount: 1 }),
    undefined,
  );
});

test("답글 공감 갱신도 같은 규칙이다", () => {
  const data = {
    pages: [
      { items: [{ id: 501, liked: true, likeCount: 34 }], nextCursor: null },
    ],
    pageParams: [null],
  };
  const next = applyReplyLike(data, 501, { liked: false, likeCount: 33 });
  assert.deepEqual(next.pages[0].items[0], {
    id: 501,
    liked: false,
    likeCount: 33,
  });
});

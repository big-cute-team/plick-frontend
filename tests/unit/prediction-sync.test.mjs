/**
 * @file 승부예측 캐시 정리 테스트 (KAN-695). 쓰기 뒤 무효화 범위가 가이드 §8(요약, 의견,
 * 홈, 내 기록)과 맞는지와, 공감 낙관 갱신이 무한 쿼리 페이지의 그 의견만 덮는지 본다.
 * 차단 뒤 그 사용자의 의견·답글만 페이지에서 빠지는지도 본다(KAN-697).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { predictionKeys } from "../../packages/core/src/predictionKeys.ts";
import {
  applyOpinionLike,
  applyReplyLike,
  applyReplyUpdate,
  invalidateAfterPredictionWrite,
  invalidateAfterReplyWrite,
  removeBlockedOpinions,
  removeBlockedReplies,
  removeReply,
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

test("차단 뒤에는 그 사용자의 의견만 빠지고 손대지 않은 페이지는 같은 참조다", () => {
  const author = (userId) => ({
    userId,
    nickname: `u${userId}`,
    favoriteTeam: null,
  });
  const untouched = page([{ id: 1, author: author(5) }]);
  const data = {
    pages: [
      untouched,
      page([
        { id: 2, author: author(7) },
        { id: 3, author: author(9) },
      ]),
    ],
    pageParams: [null, "c1"],
  };
  const next = removeBlockedOpinions(data, 7);
  assert.equal(next.pages[0], untouched);
  assert.deepEqual(
    next.pages[1].items.map((item) => item.id),
    [3],
  );
  assert.equal(removeBlockedOpinions(data, 99), data);
  assert.equal(removeBlockedOpinions(undefined, 7), undefined);
  assert.deepEqual(predictionKeys.opinions(1, "accuracy", null).slice(0, 2), [
    ...predictionKeys.opinionLists(),
  ]);
});

test("차단 뒤 답글도 같은 규칙이다", () => {
  const data = {
    pages: [
      {
        items: [
          { id: 501, author: { userId: 31, nickname: "a" } },
          { id: 502, author: { userId: 12, nickname: "b" } },
        ],
        nextCursor: null,
      },
    ],
    pageParams: [null],
  };
  const next = removeBlockedReplies(data, 31);
  assert.deepEqual(
    next.pages[0].items.map((item) => item.id),
    [502],
  );
  assert.deepEqual(predictionKeys.replies(1).slice(0, 2), [
    ...predictionKeys.replyLists(),
  ]);
});

test("답글 수정 응답은 그 답글만 덮고 지우기는 그 답글만 뺀다 (KAN-698)", () => {
  const data = {
    pages: [
      {
        items: [
          { id: 501, content: "a", isEdited: false },
          { id: 502, content: "b", isEdited: false },
        ],
        nextCursor: "c1",
      },
      { items: [{ id: 503, content: "c", isEdited: false }], nextCursor: null },
    ],
    pageParams: [null, "c1"],
  };
  const edited = applyReplyUpdate(data, {
    id: 502,
    content: "b2",
    isEdited: true,
  });
  assert.equal(edited.pages[0].items[1].content, "b2");
  assert.equal(edited.pages[0].items[1].isEdited, true);
  assert.equal(edited.pages[0].items[0], data.pages[0].items[0]);
  assert.equal(edited.pages[1], data.pages[1]);
  assert.equal(applyReplyUpdate(data, { id: 999, content: "x" }), data);

  const removed = removeReply(data, 503);
  assert.deepEqual(removed.pages[1].items, []);
  assert.equal(removed.pages[0], data.pages[0]);
  assert.equal(removeReply(data, 999), data);
  assert.equal(removeReply(undefined, 1), undefined);
});

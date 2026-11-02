/**
 * @file 시즌 랭킹 표기 헬퍼 테스트 (KAN-701). 시즌 라벨, 연속 적중 칸, 1~3위 강조, 내 순위 칸과 안내를 본다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isPredictionTopRank,
  predictionMyRankCell,
  predictionRankingNotice,
  predictionSeasonLabel,
  predictionStreakLabel,
} from "../../packages/domain/src/prediction.ts";

test("시즌 라벨은 연도에 다음 해 두 자리를 붙이고 ALL은 통산", () => {
  assert.equal(predictionSeasonLabel("2026"), "2026-27 시즌");
  assert.equal(predictionSeasonLabel("2099"), "2099-00 시즌");
  assert.equal(predictionSeasonLabel("ALL"), "통산");
  assert.equal(predictionSeasonLabel("odd"), "odd");
});

test("연속 적중은 3 이상만 숫자", () => {
  assert.equal(predictionStreakLabel(0), "");
  assert.equal(predictionStreakLabel(2), "");
  assert.equal(predictionStreakLabel(3), "3");
  assert.equal(predictionStreakLabel(12), "12");
});

test("1~3위만 강조", () => {
  assert.equal(isPredictionTopRank(1), true);
  assert.equal(isPredictionTopRank(3), true);
  assert.equal(isPredictionTopRank(4), false);
  assert.equal(isPredictionTopRank(0), false);
});

test("내 순위 칸은 자격 미달이면 채운 정도, 집계 중이면 빈 표시, 아니면 순위", () => {
  assert.equal(
    predictionMyRankCell({ rank: null, qualified: false, remaining: 2 }),
    "3/5",
  );
  assert.equal(
    predictionMyRankCell({ rank: null, qualified: false, remaining: 5 }),
    "0/5",
  );
  assert.equal(
    predictionMyRankCell({ rank: null, qualified: false, remaining: 9 }),
    "0/5",
  );
  assert.equal(
    predictionMyRankCell({ rank: null, qualified: true, remaining: 0 }),
    "-",
  );
  assert.equal(
    predictionMyRankCell({ rank: 128, qualified: true, remaining: 0 }),
    "128",
  );
});

test("내 순위 안내는 자격 미달과 집계 중에만", () => {
  assert.equal(
    predictionRankingNotice({ rank: null, qualified: false, remaining: 2 }),
    "2경기 더 예측하면 랭킹에 올라요",
  );
  assert.equal(
    predictionRankingNotice({ rank: null, qualified: true, remaining: 0 }),
    "순위를 집계하고 있어요",
  );
  assert.equal(
    predictionRankingNotice({ rank: 128, qualified: true, remaining: 0 }),
    null,
  );
});

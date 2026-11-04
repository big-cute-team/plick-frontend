/**
 * @file 시즌 랭킹 표기 헬퍼 테스트 (KAN-701). 시즌 라벨, 연속 적중 칸, 1~3위 강조, 내 순위 칸과 안내,
 * 자격 1경기 전환(BE 후속, KAN-724와 같은 PR) 뒤의 문구와 적중률 칸을 본다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PREDICTION_RANKING_MIN_SETTLED,
  isPredictionTopRank,
  predictionMyRankCell,
  predictionRankingNotice,
  predictionRankingRateCell,
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

test("내 순위 칸은 자격 미달과 집계 중이면 빈 표시, 아니면 순위(자격 1경기, 진행 표시 없음)", () => {
  assert.equal(PREDICTION_RANKING_MIN_SETTLED, 1);
  assert.equal(
    predictionMyRankCell({ rank: null, qualified: false, remaining: 1 }),
    "-",
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

test("내 순위 안내는 자격 미달이면 첫 경기 문구, 집계 중, 순위 있으면 없음", () => {
  assert.equal(
    predictionRankingNotice({ rank: null, qualified: false, remaining: 1 }),
    "첫 경기 결과가 나오면 랭킹에 올라요",
  );
  /* BE가 기준을 다시 올려 2 이상으로 주면 남은 수를 적는다 */
  assert.equal(
    predictionRankingNotice({ rank: null, qualified: false, remaining: 3 }),
    "3경기 더 예측하면 랭킹에 올라요",
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

test("랭킹 적중률 칸은 정산 5경기 전이면 비우고 그 뒤 퍼센트", () => {
  assert.equal(
    predictionRankingRateCell({ settled: 1, hits: 1, rate: 100 }),
    "-",
  );
  assert.equal(
    predictionRankingRateCell({ settled: 4, hits: 4, rate: 100 }),
    "-",
  );
  assert.equal(
    predictionRankingRateCell({ settled: 5, hits: 3, rate: 60 }),
    "60%",
  );
  assert.equal(
    predictionRankingRateCell({ settled: 12, hits: 7, rate: 58 }),
    "58%",
  );
});

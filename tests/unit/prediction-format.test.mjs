/**
 * @file 승부예측 표기 헬퍼 테스트 (KAN-695). 기록 표기 구간(첫 예측, 4전까지, 5전부터
 * 퍼센트)과 비공개 값의 물음표 표기, 글자 수 세는 기준(앞뒤 공백 제외, 코드포인트)을 본다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatPredictionCount,
  formatPredictionHits,
  formatPredictionPercent,
  formatPredictionRecord,
  isPredictionOpinionLengthValid,
  predictionDraftKey,
  predictionTextLength,
} from "../../packages/domain/src/prediction.ts";

test("정산 0이면 첫 예측, 1~4전은 적중 수까지, 5전부터 퍼센트", () => {
  assert.equal(
    formatPredictionRecord({ settled: 0, hits: 0, rate: 0 }),
    "첫 예측",
  );
  assert.equal(
    formatPredictionRecord({ settled: 3, hits: 3, rate: 100 }),
    "3전 3적중",
  );
  assert.equal(
    formatPredictionRecord({ settled: 4, hits: 1, rate: 25 }),
    "4전 1적중",
  );
  assert.equal(
    formatPredictionRecord({ settled: 5, hits: 2, rate: 40 }),
    "5전 2적중 40%",
  );
  assert.equal(
    formatPredictionRecord({ settled: 24, hits: 17, rate: 71 }),
    "24전 17적중 71%",
  );
});

test("비공개 참여 수와 분포는 물음표, 공개면 천 단위 구분", () => {
  assert.equal(formatPredictionCount(null), "?명 예측");
  assert.equal(formatPredictionCount(0), "0명 예측");
  assert.equal(formatPredictionCount(1284), "1,284명 예측");
  assert.equal(formatPredictionPercent(null), "?%");
  assert.equal(formatPredictionPercent(31), "31%");
  assert.equal(formatPredictionHits({ settled: 25, hits: 19 }), "19/25");
});

test("글자 수는 앞뒤 공백을 빼고 코드포인트로 센다", () => {
  assert.equal(predictionTextLength("  맨시티 원정  "), 6);
  assert.equal(predictionTextLength("😀😀😀😀😀"), 5);
  assert.equal(isPredictionOpinionLengthValid("네자만"), false);
  assert.equal(isPredictionOpinionLengthValid("    "), false);
  assert.equal(isPredictionOpinionLengthValid("다섯자의견"), true);
  assert.equal(isPredictionOpinionLengthValid("가".repeat(300)), true);
  assert.equal(isPredictionOpinionLengthValid("가".repeat(301)), false);
});

test("임시 저장 키는 경기별로 갈린다", () => {
  assert.equal(predictionDraftKey(1208345), "plick:pred-draft:1208345");
});

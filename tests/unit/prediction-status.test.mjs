/**
 * @file 승부예측 탭 표기 헬퍼 테스트 (KAN-696). 상태 줄 다섯 갈래, 픽 라벨, 열림 시각 표기,
 * 임시 저장 값 되살리기(옛 포맷과 깨진 값은 버림)를 본다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatPredictionOpensAt,
  parsePredictionDraft,
  predictionPercentOf,
  predictionPickLabel,
  predictionStatusLine,
  predictionVerdictLabel,
} from "../../packages/domain/src/prediction.ts";

const teams = { home: "맨유", away: "맨시티" };

test("픽 라벨은 홈·원정이 팀명 승, 무승부는 그대로", () => {
  assert.equal(predictionPickLabel("HOME", teams), "맨유 승");
  assert.equal(predictionPickLabel("DRAW", teams), "무승부");
  assert.equal(predictionPickLabel("AWAY", teams), "맨시티 승");
});

test("열림 시각은 요일 없이 월일과 24시간 시각", () => {
  assert.equal(
    formatPredictionOpensAt("2026-09-14T22:30:00+09:00"),
    "9월 14일 22:30 열림",
  );
  assert.equal(
    formatPredictionOpensAt("2026-09-14T15:00:00Z"),
    "9월 15일 00:00 열림",
  );
});

test("상태 줄: UPCOMING 열림 시각, OPEN 없음, LOCKED 마감, VOID 취소", () => {
  const base = { opensAt: "2026-09-14T22:30:00+09:00", outcome: null };
  assert.equal(
    predictionStatusLine({ ...base, status: "UPCOMING" }, teams),
    "9월 14일 22:30 열림",
  );
  assert.equal(predictionStatusLine({ ...base, status: "OPEN" }, teams), null);
  assert.equal(
    predictionStatusLine({ ...base, status: "LOCKED" }, teams),
    "예측 마감",
  );
  assert.equal(
    predictionStatusLine({ ...base, status: "VOID" }, teams),
    "경기 취소, 적중 기록 제외",
  );
});

test("상태 줄: SETTLED는 스코어와 이긴 쪽, 정산 정보가 없으면 결과 확정", () => {
  const settled = (outcome) =>
    predictionStatusLine(
      { status: "SETTLED", opensAt: "2026-09-14T22:30:00+09:00", outcome },
      teams,
    );
  assert.equal(
    settled({ result: "AWAY", homeGoals: 1, awayGoals: 2, hitRate: 55 }),
    "결과 1 - 2 맨시티 승",
  );
  assert.equal(
    settled({ result: "DRAW", homeGoals: 1, awayGoals: 1, hitRate: 20 }),
    "결과 1 - 1 무승부",
  );
  assert.equal(settled(null), "결과 확정");
});

test("적중 표기는 HIT·MISS만, 정산 전과 무효는 없음", () => {
  assert.equal(predictionVerdictLabel("HIT"), "적중");
  assert.equal(predictionVerdictLabel("MISS"), "빗나감");
  assert.equal(predictionVerdictLabel("PENDING"), null);
  assert.equal(predictionVerdictLabel("VOID"), null);
  assert.equal(predictionVerdictLabel(null), null);
});

test("분포 칸 값은 픽별로, 비공개면 null", () => {
  const dist = { home: 31, draw: 24, away: 45 };
  assert.equal(predictionPercentOf(dist, "HOME"), 31);
  assert.equal(predictionPercentOf(dist, "DRAW"), 24);
  assert.equal(predictionPercentOf(dist, "AWAY"), 45);
  assert.equal(predictionPercentOf(null, "AWAY"), null);
});

test("임시 저장은 픽과 본문을 되살리고 깨진 값은 버린다", () => {
  assert.deepEqual(
    parsePredictionDraft(JSON.stringify({ pick: "AWAY", opinion: "맨시티가" })),
    { pick: "AWAY", opinion: "맨시티가" },
  );
  assert.deepEqual(
    parsePredictionDraft(JSON.stringify({ pick: null, opinion: "" })),
    { pick: null, opinion: "" },
  );
  assert.equal(parsePredictionDraft(null), null);
  assert.equal(parsePredictionDraft("그냥 글"), null);
  assert.equal(
    parsePredictionDraft(JSON.stringify({ pick: "X", opinion: "a" })),
    null,
  );
  assert.equal(parsePredictionDraft(JSON.stringify({ pick: "HOME" })), null);
  const long = parsePredictionDraft(
    JSON.stringify({ pick: "HOME", opinion: "a".repeat(400) }),
  );
  assert.equal(long.opinion.length, 300);
});

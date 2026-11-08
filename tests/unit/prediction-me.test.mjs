/**
 * @file MY 내 기록 표기 헬퍼 테스트 (KAN-702). 기록 상자 네 칸, 보조 줄, 기록 행의 제목·픽·결과를 본다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildMyPredictionStatCells,
  myPredictionPickLine,
  myPredictionResultLabel,
  myPredictionStatsCaption,
  myPredictionTitle,
  predictionTeamLabel,
} from "../../packages/domain/src/prediction.ts";

const STATS = {
  season: {
    settled: 12,
    hits: 7,
    rate: 58,
    streak: 1,
    bestStreak: 4,
    rank: 128,
    qualified: true,
  },
  all: { settled: 31, hits: 17, rate: 55 },
  predictionCount: 14,
};

const MUN = {
  id: 1,
  code: "MUN",
  name: "맨체스터 유나이티드",
  shortName: "MUN",
  logo: null,
};
const MCI = {
  id: 2,
  code: "MCI",
  name: "맨체스터 시티",
  shortName: "MCI",
  logo: null,
};
const COV = {
  id: null,
  code: null,
  name: "코번트리",
  shortName: "COV",
  logo: null,
};

test("기록 상자 네 칸은 적중률, 적중, 시즌 순위(강조), 예측 수", () => {
  const cells = buildMyPredictionStatCells(STATS);
  assert.deepEqual(
    cells.map((c) => [c.label, c.value, c.accent]),
    [
      ["적중률", "58%", false],
      ["적중", "7/12", false],
      ["시즌 순위", "128위", true],
      ["예측", "14", false],
    ],
  );
});

test("기록을 못 받았거나 자격 미달이면 값 자리에 -", () => {
  assert.deepEqual(
    buildMyPredictionStatCells(null).map((c) => c.value),
    ["-", "-", "-", "-"],
  );
  const cells = buildMyPredictionStatCells({
    ...STATS,
    season: { ...STATS.season, rank: null, qualified: false },
  });
  assert.equal(cells[2].value, "-");
  assert.equal(cells[0].value, "58%");
});

test("보조 줄은 연속, 최고 연속, 통산 기록", () => {
  assert.equal(
    myPredictionStatsCaption(STATS),
    "연속 적중 1, 최고 4, 통산 31전 17적중 55%",
  );
  assert.equal(
    myPredictionStatsCaption({
      ...STATS,
      all: { settled: 0, hits: 0, rate: 0 },
    }),
    "연속 적중 1, 최고 4, 통산 첫 예측",
  );
});

test("팀 표기는 빅6면 레지스트리 이름, 아니면 서버 이름", () => {
  assert.equal(predictionTeamLabel(MUN), "맨체스터 유나이티드");
  assert.equal(predictionTeamLabel(COV), "코번트리");
});

test("기록 행 제목은 정산돼 스코어가 있을 때만 점수, 아니면 vs", () => {
  assert.equal(
    myPredictionTitle({
      home: MUN,
      away: MCI,
      status: "SETTLED",
      score: { home: 1, away: 2 },
    }),
    "맨체스터 유나이티드 1 - 2 맨체스터 시티",
  );
  assert.equal(
    myPredictionTitle({ home: MUN, away: COV, status: "OPEN", score: null }),
    "맨체스터 유나이티드 vs 코번트리",
  );
  assert.equal(
    myPredictionTitle({
      home: MUN,
      away: MCI,
      status: "VOID",
      score: null,
    }),
    "맨체스터 유나이티드 vs 맨체스터 시티",
  );
});

test("둘째 줄은 내 예측과 픽", () => {
  assert.equal(
    myPredictionPickLine({ home: MUN, away: MCI, pick: "AWAY" }),
    "내 예측 맨체스터 시티 승",
  );
  assert.equal(
    myPredictionPickLine({ home: MUN, away: MCI, pick: "DRAW" }),
    "내 예측 무승부",
  );
});

test("결과 칸은 적중 여부가 먼저고 무효, 경기 상태 순", () => {
  assert.deepEqual(
    myPredictionResultLabel({ status: "SETTLED", result: "HIT" }),
    {
      text: "적중",
      tone: "accent",
    },
  );
  assert.deepEqual(
    myPredictionResultLabel({ status: "SETTLED", result: "MISS" }),
    { text: "빗나감", tone: "muted" },
  );
  assert.deepEqual(
    myPredictionResultLabel({ status: "VOID", result: "VOID" }),
    { text: "기록 제외", tone: "muted" },
  );
  assert.equal(
    myPredictionResultLabel({ status: "OPEN", result: "PENDING" }).text,
    "킥오프 전",
  );
  assert.equal(
    myPredictionResultLabel({ status: "LOCKED", result: "PENDING" }).text,
    "경기 중",
  );
  assert.equal(
    myPredictionResultLabel({ status: "SETTLED", result: "PENDING" }).text,
    "집계 중",
  );
});

/**
 * @file 홈 승부예측 카드 표기 헬퍼 테스트 (KAN-700). 킥오프 표기(오늘, 월일), 맨 아래 줄(정산이면
 * 적중 비율, 아니면 참여 수), 내 결과 판정, 내 순위 표기, 예측 탭 경로를 본다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  matchPredictionPath,
  predictionHomeFooter,
  predictionHomeVerdict,
  predictionKickoffLabel,
  predictionRankLabel,
  predictionStatusLine,
} from "../../packages/domain/src/prediction.ts";

test("킥오프는 KST 같은 날이면 오늘, 아니면 월일에 24시간 시각", () => {
  const now = new Date("2026-09-22T10:00:00+09:00");
  assert.equal(
    predictionKickoffLabel("2026-09-22T20:30:00+09:00", now),
    "오늘 20:30",
  );
  assert.equal(
    predictionKickoffLabel("2026-09-22T23:59:00+09:00", now),
    "오늘 23:59",
  );
  assert.equal(
    predictionKickoffLabel("2026-09-27T00:30:00+09:00", now),
    "9월 27일 00:30",
  );
  assert.equal(predictionKickoffLabel("not-a-date", now), "");
});

test("맨 아래 줄은 정산이면 적중 비율, 아니면 참여 수", () => {
  assert.equal(
    predictionHomeFooter({
      status: "SETTLED",
      outcome: { result: "AWAY", homeGoals: 1, awayGoals: 2, hitRate: 55 },
      totalCount: 1284,
    }),
    "예측한 사람 중 55% 적중",
  );
  assert.equal(
    predictionHomeFooter({ status: "OPEN", outcome: null, totalCount: 1284 }),
    "1,284명 예측",
  );
  assert.equal(
    predictionHomeFooter({ status: "OPEN", outcome: null, totalCount: null }),
    "?명 예측",
  );
  assert.equal(
    predictionHomeFooter({
      status: "VOID",
      outcome: {
        result: "VOID",
        homeGoals: null,
        awayGoals: null,
        hitRate: null,
      },
      totalCount: 12,
    }),
    "12명 예측",
  );
});

test("내 결과는 정산된 경기에 내 픽이 있을 때만", () => {
  const outcome = { result: "AWAY", homeGoals: 1, awayGoals: 2, hitRate: 55 };
  assert.equal(
    predictionHomeVerdict({ status: "SETTLED", myPick: "AWAY", outcome }),
    "적중",
  );
  assert.equal(
    predictionHomeVerdict({ status: "SETTLED", myPick: "HOME", outcome }),
    "빗나감",
  );
  assert.equal(
    predictionHomeVerdict({ status: "SETTLED", myPick: null, outcome }),
    null,
  );
  assert.equal(
    predictionHomeVerdict({ status: "OPEN", myPick: "AWAY", outcome: null }),
    null,
  );
});

test("내 순위는 자격이 있으면 n위, 아니면 랭킹", () => {
  assert.equal(
    predictionRankLabel({ season: { rank: 128, qualified: true } }),
    "128위",
  );
  assert.equal(
    predictionRankLabel({ season: { rank: null, qualified: false } }),
    "랭킹",
  );
  assert.equal(predictionRankLabel(null), "랭킹");
});

test("예측 탭 경로와 열림 시각 없는 상태 줄", () => {
  assert.equal(
    matchPredictionPath(1208345),
    "/live/matches/1208345?tab=prediction",
  );
  assert.equal(
    predictionStatusLine(
      { status: "LOCKED", outcome: null },
      { home: "맨유", away: "맨시티" },
    ),
    "예측 마감",
  );
  assert.equal(
    predictionStatusLine(
      { status: "UPCOMING", outcome: null },
      { home: "맨유", away: "맨시티" },
    ),
    null,
  );
});

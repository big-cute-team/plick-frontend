/**
 * @file 승부예측 경계 변환 테스트 (KAN-695). BE 응답 모양이 화면까지 새지 않게 접는
 * 변환이 삭제 의견의 null 픽, 빅6 밖 팀, 문자열 평점을 어떻게 다루는지 본다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toPredictionOpinion,
  toPredictionSummary,
  toPredictionTeam,
} from "../../packages/core/src/predictions.ts";

test("요약은 비공개면 분포와 참여 수가 null로, 내 예측은 id로 접힌다", () => {
  const locked = toPredictionSummary({
    matchId: 1,
    status: "OPEN",
    opensAt: null,
    closesAt: "2026-09-21T22:30:00+09:00",
    revealed: false,
    totalCount: null,
    distribution: null,
    myPrediction: null,
    outcome: null,
  });
  assert.equal(locked.distribution, null);
  assert.equal(locked.myPrediction, null);
  /* 항상 null로 오는 열림 시각은 도메인으로 옮기지 않는다 (KAN-747) */
  assert.equal("opensAt" in locked, false);

  const mine = toPredictionSummary({
    matchId: 1,
    status: "SETTLED",
    closesAt: null,
    revealed: true,
    totalCount: 1284,
    distribution: { home: 31, draw: 14, away: 55 },
    myPrediction: {
      predictionId: 991,
      pick: "AWAY",
      opinion: "원정 3연승",
      result: "HIT",
      isEdited: false,
    },
    outcome: { result: "AWAY", homeGoals: 1, awayGoals: 2, hitRate: 55 },
  });
  assert.equal(mine.myPrediction.id, 991);
  assert.equal(mine.outcome.hitRate, 55);
});

test("의견은 작성자 마이팀을 빅6 코드로, 삭제 의견은 픽과 결과를 null로 둔다", () => {
  const base = {
    predictionId: 1002,
    author: {
      userId: 77,
      nickname: "에티하드상주",
      favoriteTeamId: 2,
      record: { settled: 24, hits: 17, rate: 71, streak: 3 },
    },
    pick: "AWAY",
    opinion: "...",
    likeCount: 184,
    likedByMe: false,
    replyCount: 5,
    result: "PENDING",
    isEdited: false,
    isDeleted: false,
    createdAt: "2026-09-21T19:02:11+09:00",
  };
  const opinion = toPredictionOpinion(base);
  assert.equal(opinion.id, 1002);
  assert.equal(opinion.author.favoriteTeam, "MCI");
  assert.equal(opinion.liked, false);

  const deleted = toPredictionOpinion({
    ...base,
    pick: null,
    result: null,
    isDeleted: true,
    author: { ...base.author, favoriteTeamId: null },
  });
  assert.equal(deleted.pick, null);
  assert.equal(deleted.result, null);
  assert.equal(deleted.author.favoriteTeam, null);
});

test("팀은 id가 있으면 빅6 코드를, 없으면 소문자 코드로 빅6인지 보고 약어는 대문자다", () => {
  const big6 = toPredictionTeam({
    teamId: 1,
    name: "맨체스터 유나이티드",
    code: "mun",
  });
  assert.equal(big6.code, "MUN");
  assert.equal(big6.shortName, "MUN");
  const outside = toPredictionTeam({
    teamId: null,
    name: "브라이턴",
    code: "bha",
  });
  assert.equal(outside.code, null);
  assert.equal(outside.shortName, "BHA");
  const byCode = toPredictionTeam({ name: "맨시티", code: "mci" });
  assert.equal(byCode.code, "MCI");
  assert.equal(byCode.id, null);
});

/**
 * @file 프리뷰 상대 전적 경계 변환 테스트 (KAN-709). 팀명이 "맨체스"로 잘리던 자리다. 헤더의 두 팀은
 * 짧은 표기로, 그 밖은 응답 팀명 그대로 세 조각(홈, 스코어, 원정)에 담기고 결과는 홈 팀 기준이어야 한다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { toHeadToHead } from "../../packages/core/src/live.ts";

const team = (id, code, name, shortName) => ({
  id,
  code,
  name,
  shortName,
  logo: null,
});

const header = {
  id: 1,
  competitionId: 39,
  competition: "프리미어리그",
  status: "SCHEDULED",
  statusDetail: null,
  kickoffAt: "2026-11-08T23:00:00+09:00",
  elapsed: null,
  home: team(50, "MCI", "맨체스터 시티", "MCI"),
  away: team(null, null, "아스날", "ARS"),
  score: { home: null, away: null },
};

test("헤더의 두 팀은 짧은 표기로, 스코어는 세 조각으로 접힌다", () => {
  const [game] = toHeadToHead(
    [
      {
        kickoffAt: "2026-03-10T21:00:00+09:00",
        homeName: "아스날",
        awayName: "맨체스터 시티",
        homeGoals: 3,
        awayGoals: 2,
      },
    ],
    header,
  );
  assert.deepEqual(game, {
    date: "26.03.10",
    homeName: "아스날",
    homeGoals: 3,
    awayGoals: 2,
    awayName: "맨시티",
    result: "L",
  });
});

test("헤더에 없는 팀명은 그대로 두고 안 치른 경기는 뺀다", () => {
  const games = toHeadToHead(
    [
      {
        kickoffAt: "2026-02-01T21:00:00+09:00",
        homeName: "맨체스터 시티",
        awayName: "울버햄튼 원더러스",
        homeGoals: 1,
        awayGoals: 1,
      },
      {
        kickoffAt: "2026-12-01T21:00:00+09:00",
        homeName: "맨체스터 시티",
        awayName: "아스날",
        homeGoals: null,
        awayGoals: null,
      },
    ],
    header,
  );
  assert.equal(games.length, 1);
  assert.equal(games[0].homeName, "맨시티");
  assert.equal(games[0].awayName, "울버햄튼 원더러스");
  assert.equal(games[0].result, "D");
});

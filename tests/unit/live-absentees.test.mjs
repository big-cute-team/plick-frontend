/**
 * @file 프리뷰 결장자 겹침 제거 테스트 (KAN-668). BE가 목록을 두 번 이어 붙여 내려도 한 명이 한 줄이어야 한다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dedupeAbsentees,
  groupAbsenteesByTeam,
} from "../../packages/domain/src/live.ts";

const liv = { id: 1, name: "리버풀", shortName: "LIV", logo: null };
const mci = { id: 2, name: "맨체스터 시티", shortName: "MCI", logo: null };

const absentee = (team, playerId, playerName, extra = {}) => ({
  team,
  playerId,
  playerName,
  photo: null,
  reason: "Knee Injury",
  kind: "INJURY",
  ...extra,
});

test("목록이 통째로 두 번 와도 선수는 한 번씩, 처음 순서대로 남는다", () => {
  const once = [
    absentee(liv, 10, "살라"),
    absentee(liv, 11, "판 다이크"),
    absentee(mci, 20, "홀란"),
  ];
  const result = dedupeAbsentees([...once, ...once]);
  assert.deepEqual(
    result.map((a) => a.playerName),
    ["살라", "판 다이크", "홀란"],
  );
  assert.deepEqual(
    groupAbsenteesByTeam(result).map((g) => [
      g.team.shortName,
      g.players.length,
    ]),
    [
      ["LIV", 2],
      ["MCI", 1],
    ],
  );
});

test("playerId가 없으면 이름으로 가르고, 같은 이름이라도 팀이 다르면 둘 다 남는다", () => {
  const result = dedupeAbsentees([
    absentee(liv, null, "존스"),
    absentee(liv, null, "존스"),
    absentee(mci, null, "존스"),
  ]);
  assert.deepEqual(
    result.map((a) => a.team.shortName),
    ["LIV", "MCI"],
  );
});

test("같은 선수라도 사유가 다르면 겹침이 아니다", () => {
  const result = dedupeAbsentees([
    absentee(liv, 10, "살라"),
    absentee(liv, 10, "살라", { reason: "Red Card", kind: "SUSPENSION" }),
  ]);
  assert.equal(result.length, 2);
});

test("겹침이 없으면 그대로다", () => {
  const list = [absentee(liv, 10, "살라"), absentee(mci, 20, "홀란")];
  assert.deepEqual(dedupeAbsentees(list), list);
});

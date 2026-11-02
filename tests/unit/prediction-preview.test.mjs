/**
 * @file 프리뷰 팀 비교와 키플레이어 스탯 막대 빌더 테스트 (KAN-699). 나은 쪽 판정(순위와 실점은
 * 낮은 쪽), 한 팀 집계가 빠진 경우, 순위 없음 문구, 맞대결 행 유무, 막대 길이 비율을 본다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildKeyPlayerStatRows,
  buildTeamCompare,
  TEAM_COMPARE_NO_RANK,
} from "../../packages/domain/src/prediction.ts";

const team = (shortName, name) => ({
  id: 1,
  code: null,
  name,
  shortName,
  logo: null,
});
const home = team("MUN", "맨유");
const away = team("MCI", "맨시티");

const form = (t, recent, winRate, goalsForAvg, goalsAgainstAvg) => ({
  team: t,
  recent,
  winRate,
  goalsForAvg,
  goalsAgainstAvg,
});
const position = (t, rank) => ({
  team: t,
  rank,
  points: 0,
  goalDiff: 0,
  recentForm: [],
});

test("순위와 실점은 낮은 쪽이, 승률과 득점은 높은 쪽이 낫다", () => {
  const compare = buildTeamCompare(
    {
      teamForms: [
        form(home, ["W", "L", "D", "W", "W"], 60, 1.8, 1.2),
        form(away, ["W", "W", "W", "D", "L"], 60, 2.4, 0.8),
      ],
      leaguePositions: [position(home, 3), position(away, 1)],
      headToHeadSummary: { homeWins: 1, draws: 1, awayWins: 3, matches: 5 },
    },
    { home, away },
  );
  assert.deepEqual(compare.homeRecent, ["W", "L", "D", "W", "W"]);
  assert.deepEqual(
    compare.rows.map((r) => [r.key, r.home, r.away, r.better]),
    [
      ["rank", "3위", "1위", "away"],
      ["winRate", "60%", "60%", null],
      ["goalsFor", "1.8", "2.4", "away"],
      ["goalsAgainst", "1.2", "0.8", "away"],
      ["headToHead", "1승", "3승", "away"],
    ],
  );
  assert.equal(compare.rows[4].label, "맞대결 1무");
});

test("한 팀 집계가 빠지면 그 칸은 null, 순위는 문구, 맞대결 0경기는 행을 뺀다", () => {
  const compare = buildTeamCompare(
    {
      teamForms: [form(home, ["W"], 100, 3, 0)],
      leaguePositions: [position(home, 7)],
      headToHeadSummary: { homeWins: 0, draws: 0, awayWins: 0, matches: 0 },
    },
    { home, away },
  );
  assert.deepEqual(compare.awayRecent, []);
  const rank = compare.rows.find((r) => r.key === "rank");
  assert.equal(rank.home, "7위");
  assert.equal(rank.away, TEAM_COMPARE_NO_RANK);
  assert.equal(rank.better, null);
  const winRate = compare.rows.find((r) => r.key === "winRate");
  assert.equal(winRate.away, null);
  assert.equal(winRate.better, null);
  assert.equal(
    compare.rows.some((r) => r.key === "headToHead"),
    false,
  );
});

test("숫자가 null인 칸은 null로 두고, 재료가 하나도 없으면 표 자체가 없다", () => {
  const compare = buildTeamCompare(
    {
      teamForms: [
        form(home, [], null, null, null),
        form(away, [], null, null, null),
      ],
      leaguePositions: [],
      headToHeadSummary: null,
    },
    { home, away },
  );
  assert.equal(compare.rows.find((r) => r.key === "goalsFor").home, null);
  assert.equal(
    buildTeamCompare(
      { teamForms: [], leaguePositions: [], headToHeadSummary: null },
      { home, away },
    ),
    null,
  );
});

test("화면 정밀도로 반올림해 같아지는 값은 어느 쪽도 낫지 않다", () => {
  const compare = buildTeamCompare(
    {
      teamForms: [
        form(home, ["W"], 60, 1.84, 1.0),
        form(away, ["W"], 60, 1.76, 1.04),
      ],
      leaguePositions: [],
      headToHeadSummary: null,
    },
    { home, away },
  );
  const goalsFor = compare.rows.find((r) => r.key === "goalsFor");
  assert.deepEqual(
    [goalsFor.home, goalsFor.away, goalsFor.better],
    ["1.8", "1.8", null],
  );
  const goalsAgainst = compare.rows.find((r) => r.key === "goalsAgainst");
  assert.deepEqual(
    [goalsAgainst.home, goalsAgainst.away, goalsAgainst.better],
    ["1.0", "1.0", null],
  );

  const [, , , rating] = buildKeyPlayerStatRows(
    { appearances: 1, goals: 0, assists: 0, rating: 7.45 },
    { appearances: 1, goals: 0, assists: 0, rating: 7.46 },
  );
  assert.deepEqual(
    [
      rating.home,
      rating.away,
      rating.homeRatio,
      rating.awayRatio,
      rating.better,
    ],
    ["7.5", "7.5", 100, 100, null],
  );
});

test("키플레이어 스탯은 큰 쪽이 100이고 없는 쪽은 - 에 빈 막대", () => {
  const rows = buildKeyPlayerStatRows(
    { appearances: 8, goals: 2, assists: 4, rating: 7.45 },
    { appearances: 4, goals: 2, assists: 0, rating: null },
  );
  assert.deepEqual(
    rows.map((r) => [
      r.key,
      r.home,
      r.away,
      r.homeRatio,
      r.awayRatio,
      r.better,
    ]),
    [
      ["appearances", "8", "4", 100, 50, "home"],
      ["goals", "2", "2", 100, 100, null],
      ["assists", "4", "0", 100, 0, "home"],
      ["rating", "7.5", "-", 100, 0, null],
    ],
  );
  const empty = buildKeyPlayerStatRows(null, null);
  assert.equal(empty.length, 4);
  assert.deepEqual(
    [empty[0].home, empty[0].away, empty[0].homeRatio, empty[0].awayRatio],
    ["-", "-", 0, 0],
  );
});

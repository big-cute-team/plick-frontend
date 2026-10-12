/**
 * @file 선수 프로필 순수 함수 테스트 (KAN-600). 90분당, 골키퍼 구성 전환, 클린시트의 대회 범위,
 * 출전 막대 집계, 결과 표기, 같은 팀 선수 고르기의 경계를 잡는다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  birthLabel,
  cleanSheetsIn,
  matchResultLabel,
  matchStatLine,
  per90,
  playerStatGroups,
  teammates,
  usageCounts,
  zeroIfPlayed,
} from "../../packages/domain/src/player-profile.ts";

const stats = (over = {}) => ({
  competitionId: 39,
  competition: "프리미어리그",
  team: null,
  appearances: 6,
  lineups: 6,
  minutes: 520,
  rating: 7.6,
  subIn: 0,
  shots: 21,
  shotsOn: 11,
  goals: 4,
  assists: 2,
  conceded: 0,
  saves: null,
  passes: 210,
  keyPasses: 14,
  passAccuracy: "78",
  tackles: 6,
  blocks: 1,
  interceptions: 3,
  duels: 70,
  duelsWon: 34,
  dribbles: 18,
  dribblesWon: 9,
  foulsCommitted: 5,
  foulsDrawn: 12,
  yellowCards: 1,
  redCards: 0,
  penaltyScored: 1,
  penaltyMissed: 0,
  penaltySaved: null,
  ratingRank: null,
  ...over,
});

const match = (competitionId, participation, cleanSheet = null) => ({
  competitionId,
  participation,
  cleanSheet,
});

const member = (playerId, number, position) => ({
  playerId,
  name: `선수${playerId}`,
  number,
  position,
  photo: null,
  age: null,
  nationality: null,
  injured: false,
  competitions: [],
});

test("90분당은 합계/출전 분 x 90이고 출전 분이 없거나 0이면 '-'다", () => {
  assert.equal(per90(4, 520), "0.7");
  assert.equal(per90(0, 520), "0.0");
  assert.equal(per90(4, 0), "-");
  assert.equal(per90(4, null), "-");
  assert.equal(per90(null, 520), "-");
});

test("필드 선수는 다섯 묶음이고 골키퍼는 골키핑, 패스, 규율로 바뀐다", () => {
  const field = playerStatGroups(stats(), false, null);
  assert.deepEqual(
    field.map((g) => g.label),
    ["공격", "패스", "드리블, 경합", "수비", "규율"],
  );
  assert.deepEqual(field[0].rows[0], { label: "골", total: "4", per90: "0.7" });
  const accuracy = field[1].rows.find((r) => r.label === "패스 성공률");
  assert.deepEqual(accuracy, {
    label: "패스 성공률",
    total: "78%",
    per90: null,
  });

  const keeper = playerStatGroups(stats({ saves: 18, conceded: 5 }), true, 2);
  assert.deepEqual(
    keeper.map((g) => g.label),
    ["골키핑", "패스", "규율"],
  );
  assert.deepEqual(
    keeper[0].rows.map((r) => [r.label, r.total, r.per90]),
    [
      ["선방", "18", "3.1"],
      ["실점", "5", "0.9"],
      ["클린시트", "2", null],
      ["페널티 선방", "-", "-"],
    ],
  );
});

test("출전했는데 기록 없는 골, 도움은 0이고 출전이 없으면 '-'다", () => {
  const played = playerStatGroups(
    stats({ goals: null, assists: null }),
    false,
    null,
  );
  assert.equal(played[0].rows[0].total, "0");
  assert.equal(played[0].rows[1].total, "0");
  const benched = playerStatGroups(
    stats({
      appearances: 0,
      minutes: 0,
      goals: null,
      assists: null,
      shots: null,
    }),
    false,
    null,
  );
  assert.equal(benched[0].rows[0].total, "-");
  assert.equal(benched[0].rows[2].total, "-");
  assert.equal(benched[0].rows[2].per90, "-");
});

test("클린시트는 선택 대회 경기에서만 세고 경기 기록이 없으면 null이다", () => {
  const matches = [
    match(39, "STARTED", true),
    match(39, "STARTED", false),
    match(48, "STARTED", true),
    match(39, "ABSENT"),
  ];
  assert.equal(cleanSheetsIn(matches, 39), 1);
  assert.equal(cleanSheetsIn(matches, 48), 1);
  assert.equal(cleanSheetsIn(matches, 2), 0);
  assert.equal(cleanSheetsIn(null, 39), null);
});

test("출전 막대는 선발, 교체, 결장을 세고 조회 실패(UNKNOWN)는 뺀다", () => {
  assert.deepEqual(
    usageCounts([
      match(39, "STARTED"),
      match(39, "STARTED"),
      match(39, "SUB"),
      match(39, "ABSENT"),
      match(39, "UNKNOWN"),
    ]),
    { started: 2, sub: 1, absent: 1 },
  );
});

test("결과 표기는 이 선수 팀 기준 스코어다", () => {
  assert.equal(
    matchResultLabel({
      isHome: true,
      result: "W",
      score: { home: 2, away: 1 },
    }),
    "승 2-1",
  );
  assert.equal(
    matchResultLabel({
      isHome: false,
      result: "L",
      score: { home: 1, away: 0 },
    }),
    "패 0-1",
  );
  assert.equal(
    matchResultLabel({
      isHome: true,
      result: null,
      score: { home: 1, away: 1 },
    }),
    null,
  );
});

test("생년월일은 점 구분에 나이를 붙이고 있는 값만 쓴다", () => {
  assert.equal(birthLabel("1992-07-08", 34), "1992.07.08 (34세)");
  assert.equal(birthLabel(null, 34), "34세");
  assert.equal(birthLabel("1992-07-08", null), "1992.07.08");
  assert.equal(birthLabel(null, null), null);
});

test("같은 팀 선수는 본인을 빼고 포지션 순, 번호 순으로 자른다", () => {
  const picked = teammates(
    [
      member(1, 9, "FW"),
      member(2, 1, "GK"),
      member(3, 4, "DF"),
      member(4, 2, "DF"),
      member(5, 8, "MF"),
      member(6, 30, null),
      member(7, 7, "FW"),
    ],
    7,
    5,
  );
  assert.deepEqual(
    picked.map((p) => p.playerId),
    [2, 4, 3, 5, 1],
  );
});

test("출전했으면 기록 없는 값을 0으로, 출전이 없거나 모르면 그대로 둔다", () => {
  assert.equal(zeroIfPlayed(null, 6), 0);
  assert.equal(zeroIfPlayed(3, 6), 3);
  assert.equal(zeroIfPlayed(null, 0), null);
  assert.equal(zeroIfPlayed(null, null), null);
});

test("matchStatLine은 골·도움은 있을 때만, 슈팅·패스는 값이 있으면 쓴다 (KAN-604)", () => {
  const base = { minutes: 73, goals: 0, assists: 0, shots: 1, passes: 21 };
  assert.equal(
    matchStatLine({ ...base, participation: "STARTED", goals: 1 }),
    "73', 1골, 슈팅 1, 패스 21",
  );
  assert.equal(
    matchStatLine({ ...base, participation: "SUB", shots: 0 }),
    "73', 슈팅 0, 패스 21",
  );
  assert.equal(matchStatLine({ ...base, participation: "ABSENT" }), "결장");
  assert.equal(matchStatLine({ ...base, participation: "UNKNOWN" }), "-");
  assert.equal(
    matchStatLine({
      participation: "STARTED",
      minutes: null,
      goals: null,
      assists: null,
      shots: null,
      passes: null,
    }),
    "-",
  );
});

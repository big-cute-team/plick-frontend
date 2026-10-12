/**
 * @file 팀 프로필 순수 함수 테스트 (KAN-599). 라운드 문구, 순위표 창, 팀 내 순위, 포지션 묶음,
 * 이 팀 기준 스코어처럼 FE가 계산하는 값의 경계를 잡는다. 모바일 날짜 칸(KAN-604)도 여기서 본다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  competitionOptions,
  dotDateLabel,
  groupSquadByPosition,
  memberStats,
  placeLabel,
  playedDateLabel,
  profileRatingTone,
  roundLabel,
  standingsWindow,
  teamLeaders,
  teamScoreLabel,
} from "../../packages/domain/src/team-profile.ts";

const row = (rank, id = null) => ({
  rank,
  team: { id, code: null, name: `팀${rank}`, shortName: "T", logo: null },
  played: 7,
  win: 0,
  draw: 0,
  lose: 0,
  goalDiff: 0,
  points: 0,
  zone: null,
});
const table = Array.from({ length: 20 }, (_, i) => row(i + 1, i + 101));

const member = (playerId, number, position, competitions = []) => ({
  playerId,
  name: `선수${playerId}`,
  number,
  position,
  photo: null,
  age: null,
  nationality: null,
  injured: false,
  competitions,
});
const epl = (goals, assists, rating = null) => ({
  competitionId: 39,
  appearances: 6,
  goals,
  assists,
  rating,
});

test("라운드 원문을 화면 문구로 바꾸고 모르는 형식은 비운다", () => {
  assert.equal(roundLabel("Regular Season - 7"), "7R");
  assert.equal(roundLabel("League Stage - 2"), "2R");
  assert.equal(roundLabel("3rd Round"), "3R");
  assert.equal(roundLabel("Round of 16"), "16강");
  assert.equal(roundLabel("Quarter-finals"), "8강");
  assert.equal(roundLabel("Semi-finals"), "4강");
  assert.equal(roundLabel("Final"), "결승");
  assert.equal(roundLabel("Play-offs"), null);
  assert.equal(roundLabel(null), null);
});

test("순위표 창은 이 팀을 가운데 두고 끝에서는 한쪽으로 치우쳐 5행을 채운다", () => {
  const ranks = (rows) => rows.map((r) => r.rank);
  assert.deepEqual(ranks(standingsWindow(table, 108)), [6, 7, 8, 9, 10]);
  assert.deepEqual(ranks(standingsWindow(table, 101)), [1, 2, 3, 4, 5]);
  assert.deepEqual(ranks(standingsWindow(table, 102)), [1, 2, 3, 4, 5]);
  assert.deepEqual(ranks(standingsWindow(table, 120)), [16, 17, 18, 19, 20]);
  assert.deepEqual(standingsWindow(table, 999), []);
  assert.deepEqual(ranks(standingsWindow(table.slice(0, 3), 102)), [1, 2, 3]);
});

test("팀 내 순위는 선택 대회 기록으로 정렬하고 0과 기록 없음은 뺀다", () => {
  const players = [
    member(1, 7, "FW", [epl(4, 2), { ...epl(1, 0), competitionId: 48 }]),
    member(2, 10, "MF", [epl(2, 5)]),
    member(3, 9, "FW", [epl(4, 0)]),
    member(4, 1, "GK", [epl(0, 0)]),
    member(5, 11, "FW", []),
  ];
  assert.deepEqual(
    teamLeaders(players, 39, "goals").map((l) => [l.playerId, l.value]),
    [
      [1, 4],
      [3, 4],
      [2, 2],
    ],
  );
  assert.deepEqual(
    teamLeaders(players, 39, "assists").map((l) => l.playerId),
    [2, 1],
  );
  assert.deepEqual(
    teamLeaders(players, 48, "goals").map((l) => l.playerId),
    [1],
  );
  assert.equal(memberStats(players[4], 39), null);
});

test("선수단은 GK, DF, MF, FW 순으로 묶고 포지션 미상은 마지막, 묶음 안은 번호순이다", () => {
  const groups = groupSquadByPosition([
    member(1, 9, "FW"),
    member(2, null, "FW"),
    member(3, 7, "FW"),
    member(4, 1, "GK"),
    member(5, 30, null),
  ]);
  assert.deepEqual(
    groups.map((g) => [g.position, g.players.map((p) => p.playerId)]),
    [
      ["GK", [4]],
      ["FW", [3, 1, 2]],
      [null, [5]],
    ],
  );
});

test("스코어는 이 팀 기준 득-실이고 킥오프 전이면 없다", () => {
  assert.equal(
    teamScoreLabel({ isHome: true, score: { home: 2, away: 1 } }),
    "2-1",
  );
  assert.equal(
    teamScoreLabel({ isHome: false, score: { home: 1, away: 3 } }),
    "3-1",
  );
  assert.equal(
    teamScoreLabel({ isHome: true, score: { home: null, away: null } }),
    null,
  );
});

test("평점 색 단계는 7.5와 6.8이 경계다", () => {
  assert.equal(profileRatingTone(7.5), "accent");
  assert.equal(profileRatingTone(7.4), "normal");
  assert.equal(profileRatingTone(6.8), "normal");
  assert.equal(profileRatingTone(6.7), "muted");
  assert.equal(profileRatingTone(null), "muted");
});

test("대회 선택지는 기록 순서를 따르고 선수단에만 있는 대회를 뒤에 붙인다", () => {
  const stats = [
    { competitionId: 39, competition: "프리미어리그" },
    { competitionId: 48, competition: "리그컵" },
  ];
  assert.deepEqual(
    competitionOptions(stats, [
      { id: 48, name: "League Cup" },
      { id: 2, name: "챔피언스리그" },
    ]).map((o) => o.name),
    ["프리미어리그", "리그컵", "챔피언스리그"],
  );
});

test("지난 경기 날짜는 KST 기준 월일이다", () => {
  assert.equal(playedDateLabel("2026-08-15T23:00:00+09:00"), "8월 15일");
  assert.equal(playedDateLabel("2026-10-03T16:00:00Z"), "10월 4일");
});

test("연고지와 구장은 빅6 표기만 한글로 바꾸고 모르는 값은 원문이다", () => {
  assert.equal(placeLabel("London"), "런던");
  assert.equal(
    placeLabel("Tottenham Hotspur Stadium"),
    "토트넘 홋스퍼 스타디움",
  );
  assert.equal(placeLabel("Villa Park"), "Villa Park");
});

test("dotDateLabel은 KST 기준 월.일이다 (KAN-604)", () => {
  assert.equal(dotDateLabel("2026-10-03T23:00:00+09:00"), "10.3");
  assert.equal(dotDateLabel("2026-10-03T16:00:00Z"), "10.4");
  assert.equal(dotDateLabel("2026-12-25T12:00:00+09:00"), "12.25");
});

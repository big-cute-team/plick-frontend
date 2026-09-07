/**
 * @file 라이브 스코어 껍데기용 목데이터 (KAN-446) — 배선 전까지만 산다.
 *
 * 피그마 실디자인 13장(모바일)·7장(웹)의 지면 데이터를 그대로 담았다. web·mobile
 * 두 앱이 같은 지면을 그리므로 한 곳(@plick/domain)에 두고 함께 소비한다 —
 * 앱마다 사본을 만들면 감사 대상이다. `/wire-api` 세션에서 fetch로 교체하며
 * 이 파일은 삭제한다.
 */
import type {
  LiveTeam,
  MatchDetail,
  MatchSummary,
  PlayerMatchStats,
  PlayerSeasonStats,
  StandingRow,
  TeamSquad,
} from "./live";

/** 빅6 팀 참조 (BE teams.team_id는 TEAM_IDS와 같은 값). */
const LIV: LiveTeam = {
  id: 3,
  code: "LIV",
  name: "Liverpool",
  shortName: "LIV",
};
const MCI: LiveTeam = {
  id: 2,
  code: "MCI",
  name: "Man City",
  shortName: "MCI",
};
const ARS: LiveTeam = { id: 4, code: "ARS", name: "Arsenal", shortName: "ARS" };
const CHE: LiveTeam = { id: 5, code: "CHE", name: "Chelsea", shortName: "CHE" };
const TOT: LiveTeam = {
  id: 6,
  code: "TOT",
  name: "Tottenham",
  shortName: "TOT",
};
const MUN: LiveTeam = {
  id: 1,
  code: "MUN",
  name: "Man United",
  shortName: "MUN",
};

/** 빅6 밖 팀 — id·code null이라 제네릭 크레스트·스쿼드 진입 불가를 검증한다. */
function outsider(name: string, shortName: string): LiveTeam {
  return { id: null, code: null, name, shortName };
}

/** 목데이터 기준 "오늘". 날짜 스트립·기본 목록이 이 날을 중심으로 그려진다. */
export const MOCK_TODAY = "2026-09-05";

/**
 * 날짜별 경기 목록. 기준일(금)은 카드 4상태(라이브·예정·종료·연기)가 다 있고,
 * 나머지 날은 빈 배열이라 빈 상태 지면을 자연스럽게 확인할 수 있다.
 */
const LIVE_MATCH: MatchSummary = {
  id: 1001,
  competition: "프리미어리그",
  round: "4R",
  status: "LIVE",
  statusDetail: null,
  kickoffAt: "2026-09-05T21:00:00+09:00",
  elapsed: 67,
  home: LIV,
  away: MCI,
  score: { home: 2, away: 1 },
};

/** 예정 경기 카드. */
const SCHEDULED_MATCH: MatchSummary = {
  id: 1002,
  competition: "프리미어리그",
  round: "4R",
  status: "SCHEDULED",
  statusDetail: null,
  kickoffAt: "2026-09-05T23:00:00+09:00",
  elapsed: null,
  home: TOT,
  away: MUN,
  score: { home: null, away: null },
};

/** 종료 경기 카드. */
const FINISHED_MATCH: MatchSummary = {
  id: 1003,
  competition: "리그컵",
  round: "3R",
  status: "FINISHED",
  statusDetail: "FT",
  kickoffAt: "2026-09-05T19:00:00+09:00",
  elapsed: null,
  home: CHE,
  away: outsider("Coventry", "COV"),
  score: { home: 3, away: 0 },
};

/** 연기 경기 카드. */
const POSTPONED_MATCH: MatchSummary = {
  id: 1004,
  competition: "리그컵",
  round: "3R",
  status: "POSTPONED",
  statusDetail: null,
  kickoffAt: "2026-09-05T22:00:00+09:00",
  elapsed: null,
  home: ARS,
  away: outsider("Brighton", "BHA"),
  score: { home: null, away: null },
};

/**
 * 날짜별 경기 목록. 기준일(금)은 카드 4상태(라이브·예정·종료·연기)가 다 있고,
 * 다른 날은 빈 배열이라 빈 상태 지면을 자연스럽게 확인할 수 있다.
 */
export const MOCK_MATCH_DAYS: Record<string, MatchSummary[]> = {
  [MOCK_TODAY]: [LIVE_MATCH, SCHEDULED_MATCH, FINISHED_MATCH, POSTPONED_MATCH],
};

/** 순위표 13행 — 빅6 강조·챔스권(1~4위) 존·마이팀 하이라이트 지면용. */
export const MOCK_STANDINGS: StandingRow[] = [
  {
    rank: 1,
    team: LIV,
    played: 27,
    win: 19,
    draw: 5,
    lose: 3,
    goalDiff: 31,
    points: 62,
    zone: "UCL",
  },
  {
    rank: 2,
    team: ARS,
    played: 27,
    win: 18,
    draw: 6,
    lose: 3,
    goalDiff: 28,
    points: 60,
    zone: "UCL",
  },
  {
    rank: 3,
    team: MCI,
    played: 27,
    win: 17,
    draw: 5,
    lose: 5,
    goalDiff: 24,
    points: 56,
    zone: "UCL",
  },
  {
    rank: 4,
    team: outsider("Aston Villa", "AVL"),
    played: 27,
    win: 15,
    draw: 6,
    lose: 6,
    goalDiff: 11,
    points: 51,
    zone: "UCL",
  },
  {
    rank: 5,
    team: CHE,
    played: 27,
    win: 14,
    draw: 7,
    lose: 6,
    goalDiff: 14,
    points: 49,
    zone: null,
  },
  {
    rank: 6,
    team: outsider("Newcastle", "NEW"),
    played: 27,
    win: 13,
    draw: 6,
    lose: 8,
    goalDiff: 9,
    points: 45,
    zone: null,
  },
  {
    rank: 7,
    team: TOT,
    played: 27,
    win: 13,
    draw: 5,
    lose: 9,
    goalDiff: 7,
    points: 44,
    zone: null,
  },
  {
    rank: 8,
    team: outsider("Brighton", "BHA"),
    played: 27,
    win: 11,
    draw: 8,
    lose: 8,
    goalDiff: 3,
    points: 41,
    zone: null,
  },
  {
    rank: 9,
    team: MUN,
    played: 27,
    win: 11,
    draw: 6,
    lose: 10,
    goalDiff: -2,
    points: 39,
    zone: null,
  },
  {
    rank: 10,
    team: outsider("Fulham", "FUL"),
    played: 27,
    win: 9,
    draw: 8,
    lose: 10,
    goalDiff: -5,
    points: 35,
    zone: null,
  },
  {
    rank: 11,
    team: outsider("Brentford", "BRE"),
    played: 27,
    win: 9,
    draw: 6,
    lose: 12,
    goalDiff: -8,
    points: 33,
    zone: null,
  },
  {
    rank: 12,
    team: outsider("Crystal Palace", "CRY"),
    played: 27,
    win: 8,
    draw: 8,
    lose: 11,
    goalDiff: -9,
    points: 32,
    zone: null,
  },
  {
    rank: 13,
    team: outsider("West Ham", "WHU"),
    played: 27,
    win: 8,
    draw: 6,
    lose: 13,
    goalDiff: -14,
    points: 30,
    zone: null,
  },
];

/** 라이브 경기(1001)의 상세 — 요약·라인업·스탯 전 블록이 있는 기준 지면. */
const LIVE_DETAIL: MatchDetail = {
  header: LIVE_MATCH,
  preview: null,
  events: [
    {
      minute: "67'",
      type: "GOAL",
      playerName: "E. Haaland",
      detail: "P. Foden 도움",
      side: "AWAY",
    },
    {
      minute: "58'",
      type: "SUB",
      playerName: "J. Grealish ↔ B. Silva",
      detail: null,
      side: "AWAY",
    },
    {
      minute: "52'",
      type: "CARD",
      playerName: "I. Konaté",
      detail: "거친 태클",
      side: "HOME",
    },
    {
      minute: "45+2'",
      type: "GOAL",
      playerName: "D. Szoboszlai",
      detail: "P. Foden 도움",
      side: "HOME",
    },
    {
      minute: "31'",
      type: "VAR",
      playerName: null,
      detail: "득점 취소 · 오프사이드",
      side: "AWAY",
    },
    {
      minute: "12'",
      type: "GOAL",
      playerName: "M. Salah",
      detail: "A. Arnold 도움",
      side: "HOME",
    },
  ],
  lineups: {
    home: {
      team: LIV,
      formation: "4-3-3",
      players: [
        { id: 62, number: 62, name: "Kelleher", grid: "1:1", rating: 7.0 },
        { id: 66, number: 66, name: "Arnold", grid: "2:1", rating: 7.7 },
        { id: 5, number: 5, name: "Konaté", grid: "2:2", rating: 6.5 },
        { id: 4, number: 4, name: "Van Dijk", grid: "2:3", rating: 7.8 },
        { id: 26, number: 26, name: "Robertson", grid: "2:4", rating: 7.2 },
        { id: 8, number: 8, name: "Szoboszlai", grid: "3:1", rating: 8.1 },
        { id: 10, number: 10, name: "Mac Allister", grid: "3:2", rating: 7.9 },
        { id: 38, number: 38, name: "Gravenberch", grid: "3:3", rating: 7.6 },
        { id: 11, number: 11, name: "Salah", grid: "4:1", rating: 8.4 },
        { id: 9, number: 9, name: "Núñez", grid: "4:2", rating: 7.3 },
        { id: 18, number: 18, name: "Gakpo", grid: "4:3", rating: 7.5 },
      ],
      bench: [
        { id: 17, number: 17, name: "C. Jones", position: "MF", rating: 7.1 },
        {
          id: 21,
          number: 21,
          name: "K. Tsimikas",
          position: "DF",
          rating: null,
        },
        { id: 7, number: 7, name: "L. Díaz", position: "FW", rating: 6.8 },
      ],
    },
    away: {
      team: MCI,
      formation: "4-3-3",
      players: [
        { id: 231, number: 31, name: "Ederson", grid: "1:1", rating: 6.9 },
        { id: 202, number: 2, name: "Walker", grid: "2:1", rating: 6.7 },
        { id: 205, number: 5, name: "Stones", grid: "2:2", rating: 7.1 },
        { id: 203, number: 3, name: "Dias", grid: "2:3", rating: 7.2 },
        { id: 224, number: 24, name: "Gvardiol", grid: "2:4", rating: 6.8 },
        { id: 216, number: 16, name: "Rodri", grid: "3:1", rating: 7.6 },
        { id: 208, number: 8, name: "Kovacic", grid: "3:2", rating: 6.9 },
        { id: 220, number: 20, name: "B. Silva", grid: "3:3", rating: 7.0 },
        { id: 247, number: 47, name: "Foden", grid: "4:1", rating: 7.8 },
        { id: 209, number: 9, name: "Haaland", grid: "4:2", rating: 7.9 },
        { id: 211, number: 11, name: "Doku", grid: "4:3", rating: 7.2 },
      ],
      bench: [
        {
          id: 210,
          number: 10,
          name: "J. Grealish",
          position: "FW",
          rating: 6.6,
        },
        {
          id: 219,
          number: 19,
          name: "J. Alvarez",
          position: "FW",
          rating: null,
        },
        { id: 282, number: 82, name: "R. Lewis", position: "DF", rating: null },
      ],
    },
  },
  stats: [
    { label: "점유율", home: "58%", away: "42%" },
    { label: "기대 득점 (xG)", home: "2.14", away: "1.36" },
    { label: "슈팅", home: "12", away: "9" },
    { label: "유효 슈팅", home: "5", away: "3" },
    { label: "코너킥", home: "6", away: "4" },
    { label: "파울", home: "8", away: "11" },
    { label: "오프사이드", home: "2", away: "1" },
    { label: "패스 성공률", home: "87%", away: "91%" },
    { label: "경고", home: "1", away: "2" },
  ],
};

/** 예정 경기(1002)의 상세 — 프리뷰 블록만 있다. */
const SCHEDULED_DETAIL: MatchDetail = {
  header: SCHEDULED_MATCH,
  preview: {
    absentees: [
      {
        team: TOT,
        playerName: "G. Vicario",
        reason: "부상 · 발목",
        kind: "INJURY",
      },
      {
        team: TOT,
        playerName: "C. Romero",
        reason: "징계 · 퇴장",
        kind: "SUSPENSION",
      },
      {
        team: MUN,
        playerName: "L. Martínez",
        reason: "부상 · 무릎",
        kind: "INJURY",
      },
    ],
    headToHead: [
      { date: "26.01.16", line: "TOT 2 - 2 MUN", result: "D" },
      { date: "25.09.21", line: "MUN 0 - 3 TOT", result: "W" },
      { date: "25.05.22", line: "TOT 1 - 0 MUN", result: "W" },
      { date: "25.02.16", line: "TOT 1 - 0 MUN", result: "W" },
      { date: "24.09.29", line: "MUN 0 - 3 TOT", result: "W" },
    ],
    leaguePositions: [
      {
        team: TOT,
        rank: 7,
        points: 44,
        goalDiff: 7,
        recentForm: ["W", "L", "W", "D", "W"],
      },
      {
        team: MUN,
        rank: 9,
        points: 39,
        goalDiff: -2,
        recentForm: ["L", "W", "D", "L", "W"],
      },
    ],
    lastLineups: [
      {
        team: TOT,
        formation: "4-2-3-1",
        playerNames: [
          "Kinsky",
          "Porro",
          "Danso",
          "Van de Ven",
          "Udogie",
          "Bentancur",
          "Sarr",
          "Kulusevski",
          "Maddison",
          "Son",
          "Solanke",
        ],
      },
      {
        team: MUN,
        formation: "3-4-2-1",
        playerNames: [
          "Onana",
          "De Ligt",
          "Maguire",
          "Shaw",
          "Dalot",
          "Casemiro",
          "Mainoo",
          "Dorgu",
          "Fernandes",
          "Amad",
          "Højlund",
        ],
      },
    ],
  },
  events: null,
  lineups: null,
  stats: null,
};

/** 종료 경기(1003)의 상세 — 라인업 블록이 null이라 조건부 렌더를 검증한다. */
const FINISHED_DETAIL: MatchDetail = {
  header: FINISHED_MATCH,
  preview: null,
  events: [
    {
      minute: "78'",
      type: "GOAL",
      playerName: "N. Jackson",
      detail: "C. Palmer 도움",
      side: "HOME",
    },
    {
      minute: "55'",
      type: "GOAL",
      playerName: "C. Palmer",
      detail: "페널티",
      side: "HOME",
    },
    {
      minute: "41'",
      type: "CARD",
      playerName: null,
      detail: "지연 행위",
      side: "AWAY",
    },
    {
      minute: "23'",
      type: "GOAL",
      playerName: "E. Fernández",
      detail: null,
      side: "HOME",
    },
  ],
  lineups: null,
  stats: [
    { label: "점유율", home: "68%", away: "32%" },
    { label: "슈팅", home: "17", away: "4" },
    { label: "유효 슈팅", home: "8", away: "1" },
    { label: "코너킥", home: "9", away: "2" },
    { label: "파울", home: "7", away: "13" },
    { label: "패스 성공률", home: "90%", away: "74%" },
  ],
};

/** 연기 경기(1004)의 상세 — 헤더만 있고 전 블록이 null이다. */
const POSTPONED_DETAIL: MatchDetail = {
  header: POSTPONED_MATCH,
  preview: null,
  events: null,
  lineups: null,
  stats: null,
};

/** 경기 상세 목데이터 — 목록 카드 4장이 각각 다른 상태의 상세로 이어진다. */
export const MOCK_MATCH_DETAILS: Record<number, MatchDetail> = {
  1001: LIVE_DETAIL,
  1002: SCHEDULED_DETAIL,
  1003: FINISHED_DETAIL,
  1004: POSTPONED_DETAIL,
};

/** 팀 스쿼드 목데이터 — 리버풀(id 3)만 채웠다(순위표 마이팀 행 진입 지면). */
export const MOCK_SQUADS: Record<number, TeamSquad> = {
  3: {
    team: LIV,
    size: 26,
    players: [
      { id: 1, name: "A. Becker", number: 1, position: "GK" },
      { id: 62, name: "C. Kelleher", number: 62, position: "GK" },
      { id: 66, name: "T. Alexander-Arnold", number: 66, position: "DF" },
      { id: 4, name: "V. van Dijk", number: 4, position: "DF" },
      { id: 5, name: "I. Konaté", number: 5, position: "DF" },
      { id: 26, name: "A. Robertson", number: 26, position: "DF" },
      { id: 21, name: "K. Tsimikas", number: 21, position: "DF" },
      { id: 8, name: "D. Szoboszlai", number: 8, position: "MF" },
      { id: 10, name: "A. Mac Allister", number: 10, position: "MF" },
      { id: 38, name: "R. Gravenberch", number: 38, position: "MF" },
      { id: 17, name: "C. Jones", number: 17, position: "MF" },
      { id: 98, name: "T. Nyoni", number: 98, position: "MF" },
      { id: 11, name: "M. Salah", number: 11, position: "FW" },
      { id: 9, name: "D. Núñez", number: 9, position: "FW" },
      { id: 18, name: "C. Gakpo", number: 18, position: "FW" },
      { id: 7, name: "L. Díaz", number: 7, position: "FW" },
    ],
  },
};

/** 선수 경기 스탯 목데이터 — 라이브 경기(1001) 선수 몇 명만 채웠다. */
export const MOCK_PLAYER_MATCH_STATS: Record<number, PlayerMatchStats> = {
  11: {
    playerId: 11,
    name: "M. Salah",
    teamName: "Liverpool",
    position: "FW",
    number: 11,
    minutes: 67,
    rating: 8.4,
    stats: [
      { label: "득점", value: "1" },
      { label: "도움", value: "1" },
      { label: "슈팅 (유효)", value: "4 (3)" },
      { label: "키패스", value: "3" },
      { label: "패스 (성공률)", value: "38 (89%)" },
      { label: "드리블 성공", value: "3" },
      { label: "태클", value: "1" },
      { label: "듀얼 승리", value: "7" },
      { label: "파울", value: "1" },
      { label: "카드", value: "0" },
    ],
  },
};

/** 선수 시즌 스탯 목데이터 — Salah는 4개 대회, Nyoni는 무출전 빈 배열. */
export const MOCK_PLAYER_SEASON_STATS: Record<number, PlayerSeasonStats> = {
  11: {
    playerId: 11,
    name: "M. Salah",
    teamName: "Liverpool",
    position: "FW",
    season: "2026-27 시즌",
    competitions: [
      {
        name: "프리미어리그",
        appearances: 27,
        goals: 18,
        assists: 9,
        rating: 7.92,
      },
      {
        name: "챔피언스리그",
        appearances: 8,
        goals: 6,
        assists: 2,
        rating: 7.55,
      },
      { name: "FA컵", appearances: 3, goals: 2, assists: 1, rating: 7.1 },
      {
        name: "이집트 대표팀",
        appearances: 6,
        goals: 4,
        assists: 2,
        rating: 7.31,
      },
    ],
  },
  98: {
    playerId: 98,
    name: "T. Nyoni",
    teamName: "Liverpool",
    position: "MF",
    season: "2026-27 시즌",
    competitions: [],
  },
};

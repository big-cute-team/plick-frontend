/**
 * @file 라이브 스코어 fetcher 6종 (KAN-452, BE `MatchController`).
 *
 * web·mobile이 처음부터 함께 쓰는 기능이라 앱 폴더를 거치지 않고 바로 여기
 * 둔다(ADR 0011 게이트 C, 토론 `debates.ts`와 같은 판단). 서버 컴포넌트(첫
 * 렌더 씨앗·단발 읽기)와 클라 훅(폴링·시트)이 함께 부르므로 서버 액션이 아니라
 * 평범한 모듈이다. 전부 익명 허용 공개 API라 토큰을 싣지 않는다.
 *
 * BE 응답 타입은 이 파일 로컬이고(BE DTO 레코드 그대로), 화면이 쓰는
 * `@plick/domain/live` 타입으로 여기서 전부 접는다 — side("HOME"/"AWAY") 배열을
 * home/away 객체로, 세부 코드·영문 라벨을 한글 표기로, 문자열 평점을 숫자로.
 */

import { TEAM_CODES } from "@plick/domain/constants";
import {
  eventMinuteLabel,
  teamShortName,
  UCL_ZONE_MAX_RANK,
  type Absentee,
  type BenchPlayer,
  type HeadToHeadGame,
  type LastLineup,
  type LeaguePosition,
  type LineupPlayer,
  type LiveTeam,
  type MatchDetail,
  type MatchEvent,
  type MatchStat,
  type MatchStatus,
  type MatchSummary,
  type PlayerMatchStats,
  type PlayerSeasonStats,
  type PlayerStatEntry,
  type Position,
  type StandingRow,
  type TeamLineup,
  type TeamSquad,
} from "@plick/domain/live";
import { apiFetch } from "./client";

/**
 * 목록·상세의 서버 fetch 캐시 수명(초). `apiFetch`의 익명 GET 기본값(60초)은
 * 라이브 스코어엔 길다 — BE 라이브 오버레이 TTL(20초)에 맞춘다. 브라우저
 * fetch에서는 무시되는 옵션이라 클라 폴링에는 영향이 없다.
 */
const LIVE_REVALIDATE_SECONDS = 20;

type Side = "HOME" | "AWAY";

interface SideResponse {
  teamId: number | null;
  name: string;
  logo: string | null;
}

/** BE `MatchCardResponse` — 목록 카드이자 상세 header. */
interface MatchCardResponse {
  matchId: number;
  league: { id: number; name: string; logo: string | null };
  kickoffAt: string;
  status: MatchStatus;
  statusDetail: string | null;
  elapsed: number | null;
  home: SideResponse;
  away: SideResponse;
  score: { home: number | null; away: number | null };
}

interface LineupPlayerResponse {
  playerId: number;
  name: string;
  number: number | null;
  position: string | null;
  grid: string | null;
  rating: string | null;
  captain: boolean;
}

/** BE `MatchDetailResponse` — 상태에 따라 preview 또는 events·lineups·stats가 실린다. */
interface MatchDetailResponse {
  header: MatchCardResponse;
  goals: {
    side: Side;
    minute: number | null;
    extraMinute: number | null;
    playerName: string;
    detail: string | null;
  }[];
  preview: {
    absences: {
      side: Side;
      playerName: string;
      photo: string | null;
      type: string | null;
      reason: string | null;
    }[];
    headToHead: {
      kickoffAt: string;
      homeName: string;
      awayName: string;
      homeGoals: number | null;
      awayGoals: number | null;
    }[];
    standings: {
      side: Side;
      rank: number;
      played: number;
      points: number;
      goalsDiff: number;
      form: string | null;
    }[];
    lastLineups: {
      side: Side;
      formation: string | null;
      startXI: LineupPlayerResponse[];
    }[];
  } | null;
  events:
    | {
        side: Side;
        minute: number | null;
        extraMinute: number | null;
        type: string;
        detail: string | null;
        playerName: string | null;
        assistName: string | null;
      }[]
    | null;
  lineups:
    | {
        side: Side;
        teamName: string;
        formation: string | null;
        coachName: string | null;
        startXI: LineupPlayerResponse[];
        substitutes: LineupPlayerResponse[];
      }[]
    | null;
  stats:
    | { side: Side; items: { type: string; value: string | null }[] }[]
    | null;
}

interface PairResponse {
  main: number | null;
  sub: number | null;
}

/** BE `PlayerMatchStatsResponse` — Pair의 주/보조 의미는 항목마다 정해져 있다. */
interface PlayerMatchStatsResponse {
  playerId: number;
  name: string;
  photo: string | null;
  number: number | null;
  position: string | null;
  minutes: number | null;
  rating: string | null;
  captain: boolean;
  substitute: boolean;
  shots: PairResponse | null;
  goals: PairResponse | null;
  passes: {
    total: number | null;
    key: number | null;
    accuracy: string | null;
  } | null;
  tackles: PairResponse | null;
  duels: PairResponse | null;
  dribbles: PairResponse | null;
  fouls: PairResponse | null;
  cards: PairResponse | null;
}

interface StandingsResponse {
  rows: {
    rank: number;
    teamId: number | null;
    name: string;
    logo: string | null;
    played: number;
    win: number;
    draw: number;
    lose: number;
    goalsDiff: number;
    points: number;
    form: string | null;
  }[];
}

interface SquadResponse {
  teamId: number;
  players: {
    playerId: number;
    name: string;
    number: number | null;
    position: string | null;
    photo: string | null;
  }[];
}

interface PlayerSeasonStatsResponse {
  playerId: number;
  competitions: {
    leagueName: string;
    appearances: number | null;
    goals: number | null;
    assists: number | null;
    rating: string | null;
  }[];
}

/**
 * 그 날짜(KST)의 빅6 경기 목록 (`GET /api/v1/matches?date=`) — 킥오프 오름차순,
 * 없으면 빈 배열. 라이브 경기는 BE 오버레이(20초)로 최신 스코어가 온다.
 *
 * @param date "YYYY-MM-DD" (호출부가 {@link isDateKey}로 검증한다 — 형식 오류는 400)
 * @throws {ApiError} 502 `MATCH_UPSTREAM_ERROR` — 외부 API 실패에 캐시도 없을 때
 */
export async function getMatches(date: string): Promise<MatchSummary[]> {
  const { matches } = await apiFetch<{ matches: MatchCardResponse[] }>(
    `/api/v1/matches?date=${date}`,
    { next: { revalidate: LIVE_REVALIDATE_SECONDS } },
  );
  return matches.map(toMatchSummary);
}

/**
 * 경기 상세 (`GET /api/v1/matches/{matchId}`).
 *
 * @throws {ApiError} 404 `MATCH_NOT_FOUND` — 없는 id·빅6 밖 경기(호출부가 notFound로)
 */
export async function getMatchDetail(matchId: number): Promise<MatchDetail> {
  const detail = await apiFetch<MatchDetailResponse>(
    `/api/v1/matches/${matchId}`,
    { next: { revalidate: LIVE_REVALIDATE_SECONDS } },
  );
  return toMatchDetail(detail);
}

/**
 * 선수 경기 풀 스탯 (`GET /api/v1/matches/{matchId}/players/{playerId}`) —
 * 라인업에서 선수를 눌렀을 때만 부른다.
 *
 * @throws {ApiError} 404 `MATCH_NOT_FOUND` — 없는 경기·그 경기에 없는 선수
 */
export async function getPlayerMatchStats(
  matchId: number,
  playerId: number,
): Promise<PlayerMatchStats> {
  const stats = await apiFetch<PlayerMatchStatsResponse>(
    `/api/v1/matches/${matchId}/players/${playerId}`,
  );
  return toPlayerMatchStats(stats);
}

/** EPL 순위표 20행 (`GET /api/v1/standings`) — 빅6만 teamId가 있다. */
export async function getStandings(): Promise<StandingRow[]> {
  const { rows } = await apiFetch<StandingsResponse>("/api/v1/standings");
  return rows.map((row) => ({
    rank: row.rank,
    team: toLiveTeam({ teamId: row.teamId, name: row.name, logo: row.logo }),
    played: row.played,
    win: row.win,
    draw: row.draw,
    lose: row.lose,
    goalDiff: row.goalsDiff,
    points: row.points,
    zone: row.rank <= UCL_ZONE_MAX_RANK ? "UCL" : null,
  }));
}

/**
 * 빅6 선수단 (`GET /api/v1/teams/{teamId}/squad`). 원본 특성상 이적 반영이
 * 며칠 늦을 수 있다.
 *
 * @param teamId 서비스 teams.team_id (빅6만 유효)
 * @param teamName 화면 헤더용 팀명 — 응답엔 없어 호출부가 `TEAMS` 레지스트리에서 넘긴다
 * @throws {ApiError} 404 `TEAM_NOT_FOUND` — 빅6 밖 id
 */
export async function getTeamSquad(
  teamId: number,
  teamName: string,
): Promise<TeamSquad> {
  const squad = await apiFetch<SquadResponse>(`/api/v1/teams/${teamId}/squad`);
  const players = squad.players.map((player) => ({
    id: player.playerId,
    name: player.name,
    number: player.number,
    position: toPosition(player.position),
    photo: player.photo,
  }));
  return {
    team: toLiveTeam({ teamId: squad.teamId, name: teamName, logo: null }),
    size: players.length,
    players,
  };
}

/**
 * 선수 시즌 스탯 (`GET /api/v1/players/{playerId}/season-stats`) — 대회별.
 * 무출전 선수는 404가 아니라 `competitions: []`다.
 */
export async function getPlayerSeasonStats(
  playerId: number,
): Promise<PlayerSeasonStats> {
  const stats = await apiFetch<PlayerSeasonStatsResponse>(
    `/api/v1/players/${playerId}/season-stats`,
  );
  return {
    playerId: stats.playerId,
    competitions: stats.competitions.map((c) => ({
      name: c.leagueName,
      appearances: c.appearances,
      goals: c.goals,
      assists: c.assists,
      rating: parseRating(c.rating),
    })),
  };
}

/* ---------- 경계 변환 ---------- */

/** BE Side → 팀 참조. 빅6는 `TEAM_CODES`로 코드를 되찾고 로컬 크레스트를 쓴다. */
function toLiveTeam(side: SideResponse): LiveTeam {
  const code = side.teamId === null ? null : (TEAM_CODES[side.teamId] ?? null);
  return {
    id: side.teamId,
    code,
    name: side.name,
    shortName: code ?? teamShortName(side.name),
    logo: side.logo,
  };
}

function toMatchSummary(card: MatchCardResponse): MatchSummary {
  return {
    id: card.matchId,
    competitionId: card.league.id,
    competition: card.league.name,
    status: card.status,
    statusDetail: card.statusDetail,
    kickoffAt: card.kickoffAt,
    elapsed: card.elapsed,
    home: toLiveTeam(card.home),
    away: toLiveTeam(card.away),
    score: { home: card.score.home, away: card.score.away },
  };
}

function toMatchDetail(detail: MatchDetailResponse): MatchDetail {
  const header = toMatchSummary(detail.header);
  const teamOf = (side: Side) => (side === "HOME" ? header.home : header.away);

  const lineupHome = detail.lineups?.find((l) => l.side === "HOME");
  const lineupAway = detail.lineups?.find((l) => l.side === "AWAY");

  return {
    header,
    goals: detail.goals
      // 페널티 실축은 원본 type이 Goal이라 BE 요약에 섞여 온다 — 득점이 아니다
      .filter((goal) => goal.detail !== "Missed Penalty")
      .map((goal) => ({
        minute: eventMinuteLabel(goal.minute, goal.extraMinute),
        playerName: goal.playerName,
        detail: GOAL_DETAIL_LABEL[goal.detail ?? ""] ?? null,
        side: goal.side,
      })),
    preview: detail.preview
      ? {
          absentees: detail.preview.absences.map(
            (absence): Absentee => ({
              team: teamOf(absence.side),
              playerName: absence.playerName,
              photo: absence.photo,
              reason: absence.reason ?? absence.type ?? "결장",
              kind: /suspen/i.test(absence.reason ?? "")
                ? "SUSPENSION"
                : "INJURY",
            }),
          ),
          headToHead: detail.preview.headToHead.flatMap(
            (game): HeadToHeadGame[] => {
              if (game.homeGoals === null || game.awayGoals === null) {
                return []; // 아직 안 치른 경기는 전적이 아니다
              }
              const ourHomeWasHome = game.homeName === header.home.name;
              const ours = ourHomeWasHome ? game.homeGoals : game.awayGoals;
              const theirs = ourHomeWasHome ? game.awayGoals : game.homeGoals;
              return [
                {
                  date: shortDateLabel(game.kickoffAt),
                  line: `${teamShortName(game.homeName)} ${game.homeGoals} - ${game.awayGoals} ${teamShortName(game.awayName)}`,
                  result: ours > theirs ? "W" : ours < theirs ? "L" : "D",
                },
              ];
            },
          ),
          leaguePositions: detail.preview.standings.map(
            (row): LeaguePosition => ({
              team: teamOf(row.side),
              rank: row.rank,
              points: row.points,
              goalDiff: row.goalsDiff,
              recentForm: toForm(row.form),
            }),
          ),
          lastLineups: detail.preview.lastLineups.map(
            (lineup): LastLineup => ({
              team: teamOf(lineup.side),
              formation: lineup.formation ?? "-",
              playerNames: lineup.startXI.map((player) => player.name),
            }),
          ),
        }
      : null,
    // 이벤트는 시간순으로 오고 타임라인은 최신이 위라 여기서 뒤집는다
    events: detail.events ? detail.events.map(toMatchEvent).reverse() : null,
    // 킥오프 20~40분 전까지는 빈 배열이다 — 블록 없음으로 접는다
    lineups:
      lineupHome && lineupAway
        ? {
            home: toTeamLineup(lineupHome, header.home),
            away: toTeamLineup(lineupAway, header.away),
          }
        : null,
    stats:
      detail.stats && detail.stats.length > 0 ? toStats(detail.stats) : null,
  };
}

/** 득점 요약의 부가 표기 — 일반 골은 표기 없음. */
const GOAL_DETAIL_LABEL: Record<string, string> = {
  "Own Goal": "자책골",
  Penalty: "페널티",
};

/** VAR 판정 원문 → 한글. 없는 문구는 원문 그대로 보여준다. */
const VAR_DETAIL_LABEL: Record<string, string> = {
  "Goal cancelled": "골 취소",
  "Goal confirmed": "골 인정",
  "Penalty confirmed": "페널티 확정",
  "Penalty cancelled": "페널티 취소",
  "Card upgrade": "카드 상향",
  "Red card cancelled": "퇴장 취소",
  "Goal Disallowed - offside": "골 취소 · 오프사이드",
  "Goal Disallowed - handball": "골 취소 · 핸드볼",
  "Goal Disallowed - Foul": "골 취소 · 파울",
};

function toMatchEvent(event: {
  side: Side;
  minute: number | null;
  extraMinute: number | null;
  type: string;
  detail: string | null;
  playerName: string | null;
  assistName: string | null;
}): MatchEvent {
  const minute = eventMinuteLabel(event.minute, event.extraMinute);
  const type = event.type.toLowerCase();
  const detail = event.detail ?? "";

  if (type === "goal") {
    return {
      minute,
      type: "GOAL",
      playerName: event.playerName,
      detail:
        detail === "Missed Penalty"
          ? "페널티 실축"
          : (GOAL_DETAIL_LABEL[detail] ??
            (event.assistName ? `${event.assistName} 도움` : null)),
      side: event.side,
    };
  }
  if (type === "card") {
    // 칩이 경고·퇴장을 이미 말하므로 부제는 경고 누적 퇴장일 때만 단다
    const red = /red/i.test(detail);
    return {
      minute,
      type: red ? "RED_CARD" : "CARD",
      playerName: event.playerName,
      detail: red && /second/i.test(detail) ? "경고 누적" : null,
      side: event.side,
    };
  }
  if (type === "subst") {
    // 원본은 player가 들어오는 선수, assist가 나가는 선수다
    return {
      minute,
      type: "SUB",
      playerName: event.playerName,
      detail: event.assistName ? `${event.assistName} 아웃` : null,
      side: event.side,
    };
  }
  return {
    minute,
    type: "VAR",
    playerName: event.playerName,
    detail: VAR_DETAIL_LABEL[detail] ?? (detail || null),
    side: event.side,
  };
}

function toTeamLineup(
  lineup: {
    formation: string | null;
    coachName: string | null;
    startXI: LineupPlayerResponse[];
    substitutes: LineupPlayerResponse[];
  },
  team: LiveTeam,
): TeamLineup {
  return {
    team,
    formation: lineup.formation ?? "-",
    coach: lineup.coachName,
    players: lineup.startXI.map(
      (player): LineupPlayer => ({
        id: player.playerId,
        number: player.number,
        name: player.name,
        grid: player.grid,
        rating: parseRating(player.rating),
        captain: player.captain,
      }),
    ),
    bench: lineup.substitutes.map(
      (player): BenchPlayer => ({
        id: player.playerId,
        number: player.number,
        name: player.name,
        position: toPosition(player.position),
        rating: parseRating(player.rating),
      }),
    ),
  };
}

/**
 * 팀 스탯 type(API-Football 원문) → 화면 라벨과 나열 순서. 표에 없는 항목은
 * 원문 라벨로 뒤에 붙인다.
 */
const STAT_LABELS: [type: string, label: string][] = [
  ["Ball Possession", "점유율"],
  ["expected_goals", "기대 득점 (xG)"],
  ["Total Shots", "슈팅"],
  ["Shots on Goal", "유효 슈팅"],
  ["Blocked Shots", "막힌 슈팅"],
  ["Corner Kicks", "코너킥"],
  ["Fouls", "파울"],
  ["Offsides", "오프사이드"],
  ["Passes %", "패스 성공률"],
  ["Total passes", "패스"],
  ["Goalkeeper Saves", "선방"],
  ["Yellow Cards", "경고"],
  ["Red Cards", "퇴장"],
];

/** side별 items 두 배열을 type으로 합쳐 비교 행으로 만든다. 한쪽에 없는 값은 "-". */
function toStats(
  blocks: { side: Side; items: { type: string; value: string | null }[] }[],
): MatchStat[] {
  const valuesOf = (side: Side) =>
    new Map(
      (blocks.find((b) => b.side === side)?.items ?? []).map((item) => [
        item.type,
        item.value ?? "-",
      ]),
    );
  const home = valuesOf("HOME");
  const away = valuesOf("AWAY");
  const types = [...new Set([...home.keys(), ...away.keys()])];
  const known = STAT_LABELS.filter(([type]) => types.includes(type));
  const unknown = types
    .filter((type) => !STAT_LABELS.some(([known]) => known === type))
    .map((type): [string, string] => [type, type]);
  return [...known, ...unknown].map(([type, label]) => ({
    label,
    home: home.get(type) ?? "-",
    away: away.get(type) ?? "-",
  }));
}

function toPlayerMatchStats(stats: PlayerMatchStatsResponse): PlayerMatchStats {
  const pair = (
    p: PairResponse | null,
    format: (main: number, sub: number) => string,
  ) => (p && p.main !== null ? format(p.main, p.sub ?? 0) : "-");
  const accuracy = stats.passes?.accuracy;
  const entries: PlayerStatEntry[] = [
    { label: "슈팅 (유효)", value: pair(stats.shots, (m, s) => `${m} (${s})`) },
    { label: "골 / 도움", value: pair(stats.goals, (m, s) => `${m} / ${s}`) },
    {
      label: "패스 (성공률)",
      value:
        stats.passes?.total === null || stats.passes === null
          ? "-"
          : `${stats.passes.total}${accuracy ? ` (${/%$/.test(accuracy) ? accuracy : `${accuracy}%`})` : ""}`,
    },
    { label: "키패스", value: stats.passes?.key?.toString() ?? "-" },
    {
      label: "태클 / 차단",
      value: pair(stats.tackles, (m, s) => `${m} / ${s}`),
    },
    { label: "듀얼 (승리)", value: pair(stats.duels, (m, s) => `${m} (${s})`) },
    {
      label: "드리블 (성공)",
      value: pair(stats.dribbles, (m, s) => `${m} (${s})`),
    },
    {
      label: "파울 얻음 / 범함",
      value: pair(stats.fouls, (m, s) => `${m} / ${s}`),
    },
    {
      label: "경고 / 퇴장",
      value: pair(stats.cards, (m, s) => `${m} / ${s}`),
    },
  ];
  return {
    playerId: stats.playerId,
    name: stats.name,
    photo: stats.photo,
    position: toPosition(stats.position),
    number: stats.number,
    minutes: stats.minutes,
    rating: parseRating(stats.rating),
    captain: stats.captain,
    substitute: stats.substitute,
    stats: entries,
  };
}

/** 라인업(G/D/M/F)과 스쿼드(Goalkeeper 등) 두 표기를 한 그룹으로. 모르는 값은 미드필더. */
function toPosition(raw: string | null): Position {
  switch (raw?.[0]?.toUpperCase()) {
    case "G":
      return "GK";
    case "D":
      return "DF";
    case "F":
    case "A":
      return "FW";
    default:
      return "MF";
  }
}

/** "7.8" → 7.8, null·비숫자 → null(무출전). */
function parseRating(raw: string | null): number | null {
  if (raw === null) return null;
  const value = Number.parseFloat(raw);
  return Number.isNaN(value) ? null : value;
}

/** "WWDLW" → 최근 5경기 배열. W/D/L 외 문자는 버린다. */
function toForm(form: string | null): ("W" | "D" | "L")[] {
  return (form ?? "")
    .split("")
    .filter((c): c is "W" | "D" | "L" => c === "W" || c === "D" || c === "L")
    .slice(-5);
}

/** ISO → "25.03.10" (KST). 상대전적 행의 날짜다. */
function shortDateLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date(iso))
    .replaceAll("-", ".");
}

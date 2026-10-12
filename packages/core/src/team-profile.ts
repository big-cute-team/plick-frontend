/**
 * @file 팀 프로필 fetcher 넷 (KAN-599, BE `TeamProfileController`, `MatchController` 선수단).
 *
 * 전부 익명 허용 공개 API라 토큰을 싣지 않는다. 외부 데이터(API-Football)를 BE가
 * 캐시해 주는 값이라 서버 fetch 캐시 수명은 라이브 목록(20초)보다 길게 잡는다.
 * 모바일 팀 프로필도 같은 응답을 쓰므로 앱 레이어가 아니라 여기 둔다(ADR 0011 게이트 C).
 *
 * BE 응답 타입은 이 파일 로컬이고 `@plick/domain/team-profile` 타입으로 여기서 접는다.
 * 팀 참조는 라이브 스코어와 같은 `toLiveTeam`을 거쳐 빅6만 `code`를 얻는다.
 */

import type { MatchStatus, Position } from "@plick/domain/live";
import type {
  MatchResult,
  TeamCompetitionStats,
  TeamFixture,
  TeamFixtures,
  TeamRecord,
  TeamSquadMember,
  TeamSummary,
} from "@plick/domain/team-profile";
import { apiFetch } from "./client";
import { parseRating, toForm, toLiveTeam, type SideResponse } from "./live";

/** 서버 fetch 캐시 수명(초). BE 팀 프로필 캐시가 분 단위라 1분이면 충분하다. */
const TEAM_PROFILE_REVALIDATE_SECONDS = 60;

const cached = { next: { revalidate: TEAM_PROFILE_REVALIDATE_SECONDS } };

interface LeagueResponse {
  id: number;
  name: string;
  logo: string | null;
}

/** BE `TeamSummaryResponse`. */
interface TeamSummaryResponse {
  teamId: number;
  apiTeamId: number;
  name: string;
  nameEn: string;
  shortName: string;
  logo: string | null;
  leagueName: string;
  info: {
    coachName: string | null;
    coachPhoto: string | null;
    stadium: string | null;
    capacity: number | null;
    city: string | null;
    founded: number | null;
  } | null;
  nextFixture: {
    matchId: number;
    league: LeagueResponse;
    round: string | null;
    kickoffAt: string;
    status: MatchStatus;
    isHome: boolean;
    opponent: {
      teamId: number | null;
      apiTeamId: number;
      name: string;
      shortName: string;
      logo: string | null;
    };
  } | null;
  standing: {
    rank: number;
    points: number;
    played: number;
    win: number;
    draw: number;
    lose: number;
    goalsFor: number | null;
    goalsAgainst: number | null;
    goalsDiff: number;
    form: string | null;
  } | null;
  injuries: {
    playerId: number | null;
    name: string;
    photo: string | null;
    type: string | null;
    reason: string | null;
  }[];
}

/** BE `TeamFixturesResponse.Fixture`. */
interface FixtureResponse {
  matchId: number;
  league: LeagueResponse;
  round: string | null;
  kickoffAt: string;
  status: MatchStatus;
  statusDetail: string | null;
  home: SideResponse;
  away: SideResponse;
  score: { home: number | null; away: number | null };
  isHome: boolean;
  result: MatchResult | null;
}

interface RecordResponse {
  played: number | null;
  win: number | null;
  draw: number | null;
  lose: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
}

/** BE `TeamSeasonStatsResponse`. */
interface TeamSeasonStatsResponse {
  teamId: number;
  competitions: {
    leagueId: number;
    leagueName: string;
    leagueLogo: string | null;
    form: string | null;
    home: RecordResponse | null;
    away: RecordResponse | null;
    total: RecordResponse | null;
    goalsByMinute: { bucket: string; scored: number; conceded: number }[];
    goalsForPerMatch: string | null;
    goalsAgainstPerMatch: string | null;
    cleanSheets: number | null;
    failedToScore: number | null;
    longestWinStreak: number | null;
    mainFormation: string | null;
    yellowCards: number | null;
    redCards: number | null;
  }[];
}

/** BE `SquadResponse` (KAN-593 확장 필드 포함). 확장 필드는 병합 실패면 null과 빈 배열이다. */
interface SquadResponse {
  teamId: number;
  players: {
    playerId: number;
    name: string;
    number: number | null;
    position: string | null;
    photo: string | null;
    positionCode: string | null;
    age: number | null;
    nationality: string | null;
    injured: boolean | null;
    competitions:
      | {
          leagueId: number;
          leagueName: string;
          appearances: number | null;
          goals: number | null;
          assists: number | null;
          rating: string | null;
        }[]
      | null;
  }[];
}

/**
 * 팀 요약 (`GET /api/v1/teams/{teamId}/summary`). 머리, 다음 경기, 숫자 띠, 구단 정보,
 * 부상자. 보조 블록(`info`, `nextFixture`, `standing`)은 실패하면 null로 온다.
 *
 * @throws {ApiError} 404 `TEAM_NOT_FOUND`(빅6 밖), 502 `MATCH_UPSTREAM_ERROR`(외부 장애)
 */
export async function getTeamSummary(teamId: number): Promise<TeamSummary> {
  const summary = await apiFetch<TeamSummaryResponse>(
    `/api/v1/teams/${teamId}/summary`,
    cached,
  );
  const { info, nextFixture, standing } = summary;
  return {
    teamId: summary.teamId,
    name: summary.name,
    nameEn: summary.nameEn,
    leagueName: summary.leagueName,
    info: info && {
      coachName: info.coachName,
      stadium: info.stadium,
      capacity: info.capacity,
      city: info.city,
      founded: info.founded,
    },
    nextFixture: nextFixture && {
      matchId: nextFixture.matchId,
      kickoffAt: nextFixture.kickoffAt,
      isHome: nextFixture.isHome,
      opponent: toLiveTeam(nextFixture.opponent),
    },
    standing: standing && {
      rank: standing.rank,
      points: standing.points,
      played: standing.played,
      win: standing.win,
      draw: standing.draw,
      lose: standing.lose,
      goalsFor: standing.goalsFor,
      goalsAgainst: standing.goalsAgainst,
      goalDiff: standing.goalsDiff,
      form: toForm(standing.form),
    },
    injuries: summary.injuries.map((injury) => ({
      playerId: injury.playerId,
      name: injury.name,
      photo: injury.photo,
      reason: injury.reason,
    })),
  };
}

/**
 * 팀 시즌 경기 (`GET /api/v1/teams/{teamId}/fixtures`). 예정은 오름차순, 지난 경기는
 * 내림차순이고 취소 경기는 서버가 뺀다.
 *
 * @throws {ApiError} 404 `TEAM_NOT_FOUND`, 502 `MATCH_UPSTREAM_ERROR`
 */
export async function getTeamFixtures(teamId: number): Promise<TeamFixtures> {
  const { upcoming, results } = await apiFetch<{
    upcoming: FixtureResponse[];
    results: FixtureResponse[];
  }>(`/api/v1/teams/${teamId}/fixtures`, cached);
  return {
    upcoming: upcoming.map(toTeamFixture),
    results: results.map(toTeamFixture),
  };
}

/**
 * 팀 대회별 시즌 기록 (`GET /api/v1/teams/{teamId}/season-stats`). 서버가 합산하지 않고
 * 대회마다 한 칸이다. EPL이 먼저 온다.
 *
 * @throws {ApiError} 404 `TEAM_NOT_FOUND`, 502 `MATCH_UPSTREAM_ERROR`
 */
export async function getTeamSeasonStats(
  teamId: number,
): Promise<TeamCompetitionStats[]> {
  const { competitions } = await apiFetch<TeamSeasonStatsResponse>(
    `/api/v1/teams/${teamId}/season-stats`,
    cached,
  );
  return competitions.map((c) => ({
    competitionId: c.leagueId,
    competition: c.leagueName,
    home: toRecord(c.home),
    away: toRecord(c.away),
    total: toRecord(c.total),
    goalsByMinute: c.goalsByMinute,
    goalsForPerMatch: c.goalsForPerMatch,
    goalsAgainstPerMatch: c.goalsAgainstPerMatch,
    cleanSheets: c.cleanSheets,
    failedToScore: c.failedToScore,
    longestWinStreak: c.longestWinStreak,
    mainFormation: c.mainFormation,
    yellowCards: c.yellowCards,
    redCards: c.redCards,
  }));
}

/**
 * 팀 선수단 표 (`GET /api/v1/teams/{teamId}/squad`). 라이브 스쿼드(`getTeamSquad`)와 같은
 * 엔드포인트지만 KAN-593 확장 필드(나이, 국적, 부상, 대회별 기록)까지 읽는다. 대회명은
 * 선택지를 만들 때 쓰도록 따로 돌려준다.
 *
 * @throws {ApiError} 404 `TEAM_NOT_FOUND`, 502 `MATCH_UPSTREAM_ERROR`
 */
export async function getTeamSquadTable(teamId: number): Promise<{
  players: TeamSquadMember[];
  competitions: { id: number; name: string }[];
}> {
  const squad = await apiFetch<SquadResponse>(
    `/api/v1/teams/${teamId}/squad`,
    cached,
  );
  const competitions: { id: number; name: string }[] = [];
  const players = squad.players.map((player): TeamSquadMember => {
    for (const c of player.competitions ?? []) {
      if (!competitions.some((known) => known.id === c.leagueId)) {
        competitions.push({ id: c.leagueId, name: c.leagueName });
      }
    }
    return {
      playerId: player.playerId,
      name: player.name,
      number: player.number,
      position: toPositionCode(player.positionCode),
      photo: player.photo,
      age: player.age,
      nationality: player.nationality,
      injured: player.injured === true,
      competitions: (player.competitions ?? []).map((c) => ({
        competitionId: c.leagueId,
        appearances: c.appearances,
        goals: c.goals,
        assists: c.assists,
        rating: parseRating(c.rating),
      })),
    };
  });
  return { players, competitions };
}

/* ---------- 경계 변환 ---------- */

function toTeamFixture(fixture: FixtureResponse): TeamFixture {
  return {
    matchId: fixture.matchId,
    competitionId: fixture.league.id,
    competition: fixture.league.name,
    round: fixture.round,
    kickoffAt: fixture.kickoffAt,
    status: fixture.status,
    home: toLiveTeam(fixture.home),
    away: toLiveTeam(fixture.away),
    score: { home: fixture.score.home, away: fixture.score.away },
    isHome: fixture.isHome,
    result: fixture.result,
  };
}

function toRecord(record: RecordResponse | null): TeamRecord {
  return {
    played: record?.played ?? null,
    win: record?.win ?? null,
    draw: record?.draw ?? null,
    lose: record?.lose ?? null,
    goalsFor: record?.goalsFor ?? null,
    goalsAgainst: record?.goalsAgainst ?? null,
  };
}

/** BE `positionCode`(GK, DF, MF, FW) 그대로. 그 밖과 null은 포지션 미상이다. */
function toPositionCode(code: string | null): Position | null {
  return code === "GK" || code === "DF" || code === "MF" || code === "FW"
    ? code
    : null;
}

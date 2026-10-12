/**
 * @file 선수 프로필 fetcher 셋 (KAN-600, BE `PlayerProfileController`).
 *
 * 전부 익명 허용 공개 API라 토큰을 싣지 않는다. 빅6 소속이 아닌 선수는 셋 다 404
 * `PLAYER_NOT_FOUND`다. 외부 데이터(API-Football)를 BE가 캐시해 주는 값이라 팀 프로필과
 * 같은 1분 캐시를 쓴다. 모바일 선수 프로필도 같은 응답을 쓰므로 여기 둔다(ADR 0011 게이트 C).
 *
 * BE 응답 타입은 이 파일 로컬이고 `@plick/domain/player-profile` 타입으로 여기서 접는다.
 * 팀 참조는 `toLiveTeam`을 거쳐 빅6만 `code`를 얻는다(링크 판정).
 */

import { HIDDEN_SEASON_COMPETITION } from "@plick/domain/live";
import type {
  Participation,
  PlayerCompetitionStats,
  PlayerMatch,
  PlayerProfile,
  PlayerSeasonLine,
} from "@plick/domain/player-profile";
import type { MatchResult } from "@plick/domain/team-profile";
import { apiFetch } from "./client";
import { parseRating, toLiveTeam } from "./live";
import { toPositionCode } from "./team-profile";

/** 서버 fetch 캐시 수명(초). 팀 프로필과 같다. */
const PLAYER_PROFILE_REVALIDATE_SECONDS = 60;

const cached = { next: { revalidate: PLAYER_PROFILE_REVALIDATE_SECONDS } };

interface TeamResponse {
  teamId: number | null;
  apiTeamId: number;
  name: string;
  shortName: string;
  logo: string | null;
}

/** BE `PlayerProfileResponse.Competition`. 묶음마다 null일 수 있다. */
interface CompetitionResponse {
  leagueId: number;
  leagueName: string;
  leagueLogo: string | null;
  team: TeamResponse | null;
  games: {
    appearances: number | null;
    lineups: number | null;
    minutes: number | null;
    rating: string | null;
    captain: boolean | null;
  } | null;
  substitutes: {
    in: number | null;
    out: number | null;
    bench: number | null;
  } | null;
  shots: { total: number | null; on: number | null } | null;
  goals: {
    total: number | null;
    conceded: number | null;
    assists: number | null;
    saves: number | null;
  } | null;
  passes: {
    total: number | null;
    key: number | null;
    accuracy: string | null;
  } | null;
  tackles: {
    total: number | null;
    blocks: number | null;
    interceptions: number | null;
  } | null;
  duels: { total: number | null; won: number | null } | null;
  dribbles: { attempts: number | null; success: number | null } | null;
  fouls: { drawn: number | null; committed: number | null } | null;
  cards: {
    yellow: number | null;
    yellowRed: number | null;
    red: number | null;
  } | null;
  penalty: {
    scored: number | null;
    missed: number | null;
    saved: number | null;
  } | null;
  ratingRank: { rank: number; of: number } | null;
}

/** BE `PlayerProfileResponse`. */
interface PlayerProfileResponse {
  playerId: number;
  name: string;
  nameEn: string | null;
  photo: string | null;
  number: number | null;
  position: string | null;
  positionCode: string | null;
  positionName: string | null;
  birthDate: string | null;
  age: number | null;
  nationality: string | null;
  heightCm: number | null;
  weightKg: number | null;
  injured: boolean | null;
  injuryType: string | null;
  injuryReason: string | null;
  team: TeamResponse | null;
  figureId: number | null;
  competitions: CompetitionResponse[];
}

/** BE `PlayerMatchesResponse.Match`. */
interface MatchResponse {
  matchId: number;
  league: { id: number; name: string; logo: string | null };
  round: string | null;
  kickoffAt: string;
  isHome: boolean;
  opponent: TeamResponse;
  score: { home: number | null; away: number | null };
  result: MatchResult | null;
  participation: Participation;
  minutes: number | null;
  goals: number | null;
  assists: number | null;
  shots: number | null;
  passes: number | null;
  rating: string | null;
  cleanSheet: boolean | null;
}

/** BE `PlayerSeasonsResponse`. */
interface PlayerSeasonsResponse {
  playerId: number;
  seasons: {
    season: number;
    label: string;
    competitions: {
      leagueId: number;
      leagueName: string;
      team: TeamResponse | null;
      appearances: number | null;
      goals: number | null;
      assists: number | null;
      rating: string | null;
    }[];
  }[];
}

/**
 * 선수 프로필 (`GET /api/v1/players/{playerId}`). 머리말과 대회별 시즌 기록. 국가대표 대회는
 * 클럽 앱 관점에서 뺀다(KAN-459의 `HIDDEN_SEASON_COMPETITION`과 같은 기준).
 *
 * @throws {ApiError} 404 `PLAYER_NOT_FOUND`(빅6 소속 아님), 502 `MATCH_UPSTREAM_ERROR`
 */
export async function getPlayerProfile(
  playerId: number,
): Promise<PlayerProfile> {
  const p = await apiFetch<PlayerProfileResponse>(
    `/api/v1/players/${playerId}`,
    cached,
  );
  return {
    playerId: p.playerId,
    name: p.name,
    nameEn: p.nameEn,
    photo: p.photo,
    number: p.number,
    position: toPositionCode(p.positionCode),
    positionName: p.positionName,
    birthDate: p.birthDate,
    age: p.age,
    nationality: p.nationality,
    heightCm: p.heightCm,
    weightKg: p.weightKg,
    injured: p.injured === true,
    injuryReason: p.injuryReason,
    team: p.team && toLiveTeam(p.team),
    figureId: p.figureId,
    competitions: p.competitions
      .filter((c) => !HIDDEN_SEASON_COMPETITION.test(c.leagueName))
      .map(toCompetitionStats),
  };
}

/**
 * 선수 경기 기록 (`GET /api/v1/players/{playerId}/matches`). 소속팀의 종료 경기 전부,
 * 킥오프 내림차순이다.
 *
 * @throws {ApiError} 404 `PLAYER_NOT_FOUND`, 502 `MATCH_UPSTREAM_ERROR`
 */
export async function getPlayerMatches(
  playerId: number,
): Promise<PlayerMatch[]> {
  const { matches } = await apiFetch<{ matches: MatchResponse[] }>(
    `/api/v1/players/${playerId}/matches`,
    cached,
  );
  return matches.map((m) => ({
    matchId: m.matchId,
    competitionId: m.league.id,
    competition: m.league.name,
    round: m.round,
    kickoffAt: m.kickoffAt,
    isHome: m.isHome,
    opponent: toLiveTeam(m.opponent),
    score: { home: m.score.home, away: m.score.away },
    result: m.result,
    participation: m.participation,
    minutes: m.minutes,
    goals: m.goals,
    assists: m.assists,
    shots: m.shots,
    passes: m.passes,
    rating: parseRating(m.rating),
    cleanSheet: m.cleanSheet,
  }));
}

/**
 * 선수 시즌별 기록 (`GET /api/v1/players/{playerId}/seasons`). 시즌 내림차순, 시즌마다
 * 대회별 한 줄로 편다. 국가대표 대회는 뺀다.
 *
 * @throws {ApiError} 404 `PLAYER_NOT_FOUND`, 502 `MATCH_UPSTREAM_ERROR`
 */
export async function getPlayerSeasons(
  playerId: number,
): Promise<PlayerSeasonLine[]> {
  const { seasons } = await apiFetch<PlayerSeasonsResponse>(
    `/api/v1/players/${playerId}/seasons`,
    cached,
  );
  return seasons.flatMap((season) =>
    season.competitions
      .filter((c) => !HIDDEN_SEASON_COMPETITION.test(c.leagueName))
      .map((c) => ({
        season: season.label,
        competitionId: c.leagueId,
        competition: c.leagueName,
        team: c.team && toLiveTeam(c.team),
        appearances: c.appearances,
        goals: c.goals,
        assists: c.assists,
        rating: parseRating(c.rating),
      })),
  );
}

/* ---------- 경계 변환 ---------- */

function toCompetitionStats(c: CompetitionResponse): PlayerCompetitionStats {
  const red =
    c.cards?.red == null && c.cards?.yellowRed == null
      ? null
      : (c.cards?.red ?? 0) + (c.cards?.yellowRed ?? 0);
  return {
    competitionId: c.leagueId,
    competition: c.leagueName,
    team: c.team && toLiveTeam(c.team),
    appearances: c.games?.appearances ?? null,
    lineups: c.games?.lineups ?? null,
    minutes: c.games?.minutes ?? null,
    rating: parseRating(c.games?.rating ?? null),
    subIn: c.substitutes?.in ?? null,
    shots: c.shots?.total ?? null,
    shotsOn: c.shots?.on ?? null,
    goals: c.goals?.total ?? null,
    assists: c.goals?.assists ?? null,
    conceded: c.goals?.conceded ?? null,
    saves: c.goals?.saves ?? null,
    passes: c.passes?.total ?? null,
    keyPasses: c.passes?.key ?? null,
    passAccuracy: c.passes?.accuracy ?? null,
    tackles: c.tackles?.total ?? null,
    blocks: c.tackles?.blocks ?? null,
    interceptions: c.tackles?.interceptions ?? null,
    duels: c.duels?.total ?? null,
    duelsWon: c.duels?.won ?? null,
    dribbles: c.dribbles?.attempts ?? null,
    dribblesWon: c.dribbles?.success ?? null,
    foulsCommitted: c.fouls?.committed ?? null,
    foulsDrawn: c.fouls?.drawn ?? null,
    yellowCards: c.cards?.yellow ?? null,
    redCards: red,
    penaltyScored: c.penalty?.scored ?? null,
    penaltyMissed: c.penalty?.missed ?? null,
    penaltySaved: c.penalty?.saved ?? null,
    ratingRank: c.ratingRank,
  };
}

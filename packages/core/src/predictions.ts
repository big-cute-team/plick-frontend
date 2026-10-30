/**
 * @file 승부예측 읽기 fetcher 9종 (KAN-695, BE `docs/specs/prediction-api.md`).
 *
 * 웹이 첫 사용처지만 모바일도 같은 계약을 쓸 기능이라 토론·라이브처럼 앱 폴더를
 * 거치지 않고 바로 여기 둔다(ADR 0011 게이트 C). 서버 컴포넌트(첫 렌더 씨앗)와
 * 클라 훅(30초 재조회, 다음 페이지)이 함께 부르므로 서버 액션이 아니라 평범한
 * 모듈이다. 쓰기 12종은 쿠키를 읽어야 해 웹 `_services/prediction-actions.ts`
 * 서버 액션에 있고, 그쪽이 여기 BE 응답 타입과 경계 변환을 가져다 쓴다.
 *
 * 조회는 모두 익명 허용이지만 토큰을 실어야 `myPrediction`, `likedByMe`, 홈 카드의
 * `myPick`과 `revealed`가 그 유저 기준으로 온다. 브라우저에서는 각 앱 `proxy.ts`가
 * `/be` 요청에 Bearer를 심어 주므로 넘길 게 없고, 서버 컴포넌트가 부를 때만
 * `getAccessToken()`으로 꺼내 넘긴다(댓글·토론과 같은 규약, ADR 0044).
 * `/me/*` 둘은 토큰이 없으면 BE가 401을 주므로 서버에서는 반드시 넘긴다.
 *
 * 서버 데이터 캐시는 익명 GET에만 걸리는데(`apiFetch`), 예측은 종류마다 신선도가 달라
 * 호출마다 정한다. 의견 목록은 BE가 캐시하지 않는 값이라 저장하지 않고, 분포가 실리는
 * 요약·홈·키플레이어는 BE 캐시(30초)에, 랭킹은 BE 캐시(10분)에 맞춘다. 토큰을 실은
 * 호출은 `apiFetch`가 `no-store`로 돌리므로 `next` 옵션을 함께 넘기면 안 된다 -
 * 겹치면 Next가 충돌로 보고 둘 다 무시한다.
 */

import { TEAM_CODES } from "@plick/domain/constants";
import { teamShortName, type LiveTeam } from "@plick/domain/live";
import {
  MY_PREDICTIONS_PAGE_SIZE,
  PREDICTION_OPINIONS_PAGE_SIZE,
  PREDICTION_RANKINGS_PAGE_SIZE,
  PREDICTION_REPLIES_PAGE_SIZE,
  type KeyPlayerSideInfo,
  type KeyPlayers,
  type MyPrediction,
  type MyPredictionEntry,
  type MyPredictionOpinion,
  type MyPredictionPage,
  type MyPredictionStats,
  type PredictionAuthor,
  type PredictionDistribution,
  type PredictionHomeCard,
  type PredictionOpinion,
  type PredictionOpinionDetail,
  type PredictionOpinionPage,
  type PredictionOpinionSort,
  type PredictionOutcome,
  type PredictionPick,
  type PredictionRanking,
  type PredictionReply,
  type PredictionReplyPage,
  type PredictionResult,
  type PredictionStatus,
  type PredictionSummary,
} from "@plick/domain/prediction";
import type { TeamCode } from "@plick/domain/types";
import { ApiError, apiFetch } from "./client";
import { parseRating } from "./live";

/** 요약·홈·키플레이어의 익명 서버 fetch 캐시 수명(초). BE 분포 캐시(30초)와 같다. */
const DISTRIBUTION_REVALIDATE_SECONDS = 30;

/** 랭킹의 익명 서버 fetch 캐시 수명(초). BE 랭킹 캐시(10분)와 같다. */
const RANKING_REVALIDATE_SECONDS = 600;

/** BE `PredictionSummaryResponse`. 쓰기(PUT)도 같은 모양을 돌려준다. */
export interface PredictionSummaryResponse {
  matchId: number;
  status: PredictionStatus;
  opensAt: string;
  closesAt: string | null;
  revealed: boolean;
  totalCount: number | null;
  distribution: PredictionDistribution | null;
  myPrediction: {
    predictionId: number;
    pick: PredictionPick;
    opinion: string;
    result: PredictionResult;
    isEdited: boolean;
  } | null;
  outcome: {
    result: PredictionPick | "VOID";
    homeGoals: number | null;
    awayGoals: number | null;
    hitRate: number | null;
  } | null;
}

/** BE `PredictionOpinionAuthor`. `record`는 통산 기준이다. */
interface PredictionAuthorResponse {
  userId: number;
  nickname: string;
  favoriteTeamId: number | null;
  record: { settled: number; hits: number; rate: number; streak: number };
}

/** BE `PredictionOpinionResponse`. 삭제 의견은 `pick`·`result`가 null이다. */
export interface PredictionOpinionResponse {
  predictionId: number;
  author: PredictionAuthorResponse;
  pick: PredictionPick | null;
  opinion: string;
  likeCount: number;
  likedByMe: boolean;
  replyCount: number;
  result: PredictionResult | null;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
}

interface PredictionOpinionPageResponse {
  locked: boolean;
  mine: {
    predictionId: number;
    pick: PredictionPick;
    opinion: string;
    result: PredictionResult;
    isEdited: boolean;
    author: PredictionAuthorResponse;
  } | null;
  items: PredictionOpinionResponse[];
  nextCursor: string | null;
}

/** BE `PredictionReplyResponse`. 작성(POST)·수정(PATCH)도 같은 모양을 돌려준다. */
export interface PredictionReplyResponse {
  replyId: number;
  author: { userId: number; nickname: string };
  authorPick: PredictionPick | null;
  content: string;
  likeCount: number;
  likedByMe: boolean;
  isEdited: boolean;
  isMine: boolean;
  createdAt: string;
}

/** BE `KeyPlayersResponse`. 투표(PUT)도 같은 모양을 돌려준다. */
export interface KeyPlayersResponse {
  status: PredictionStatus;
  home: KeyPlayerSideResponse;
  away: KeyPlayerSideResponse;
  myVote: { home: number | null; away: number | null };
}

interface KeyPlayerSideResponse {
  player: {
    playerId: number;
    name: string;
    photo: string | null;
    position: string | null;
  } | null;
  votePercent: number;
  isDefault: boolean;
  stats: {
    appearances: number;
    goals: number;
    assists: number;
    rating: string | null;
  } | null;
  candidates: {
    playerId: number;
    name: string;
    photo: string | null;
    votePercent: number;
  }[];
}

/** 홈 카드·내 기록의 팀. 빅6 밖은 `teamId`가 null이고 `code`는 소문자 3글자다. */
interface PredictionTeamResponse {
  teamId?: number | null;
  name: string;
  code: string | null;
}

interface PredictionHomeResponse {
  items: {
    matchId: number;
    kickoffAt: string;
    competition: string;
    home: PredictionTeamResponse;
    away: PredictionTeamResponse;
    status: PredictionStatus;
    revealed: boolean;
    totalCount: number | null;
    distribution: PredictionDistribution | null;
    myPick: PredictionPick | null;
    topOpinion: {
      predictionId: number;
      nickname: string;
      opinion: string;
    } | null;
    outcome: PredictionSummaryResponse["outcome"];
  }[];
}

interface PredictionRankingResponse {
  scope: string;
  items: {
    rank: number;
    userId: number;
    nickname: string | null;
    favoriteTeamId: number | null;
    settled: number;
    hits: number;
    rate: number;
    streak: number;
  }[];
  me: {
    rank: number | null;
    settled: number;
    hits: number;
    rate: number;
    streak: number;
    qualified: boolean;
    remaining: number;
  } | null;
  nextCursor: string | null;
}

interface MyPredictionStatsResponse {
  season: {
    settled: number;
    hits: number;
    rate: number;
    streak: number;
    bestStreak: number;
    rank: number | null;
    qualified: boolean;
  };
  all: { settled: number; hits: number; rate: number };
  predictionCount: number;
}

interface MyPredictionsResponse {
  items: {
    predictionId: number;
    matchId: number;
    kickoffAt: string;
    home: PredictionTeamResponse;
    away: PredictionTeamResponse;
    status: PredictionStatus;
    pick: PredictionPick;
    result: PredictionResult;
    score: { home: number; away: number } | null;
  }[];
  nextCursor: string | null;
}

/** 서버에서 토큰을 실을 때의 공통 옵션. */
interface ReadOptions {
  /** 서버 컴포넌트에서 부를 때만 넘긴다. 브라우저 호출은 `proxy.ts`가 대신 실어 준다 */
  accessToken?: string;
}

/**
 * 호출 옵션을 만든다. 토큰이 있으면 Bearer만 싣고(캐시는 `apiFetch`가 `no-store`로),
 * 없으면 익명 서버 캐시 수명을 건다. `revalidate: 0`은 저장하지 않는다는 뜻이다.
 */
function readInit(
  accessToken: string | undefined,
  revalidate: number,
): Parameters<typeof apiFetch>[1] {
  if (accessToken) {
    return { headers: { Authorization: `Bearer ${accessToken}` } };
  }
  return revalidate === 0 ? { cache: "no-store" } : { next: { revalidate } };
}

/** 빅6 팀 id → 코드. 빅6 밖이거나 id가 없으면 null. */
function favoriteTeamCode(teamId: number | null): TeamCode | null {
  return teamId === null ? null : (TEAM_CODES[teamId] ?? null);
}

/**
 * 홈 카드·내 기록의 팀을 라이브 팀으로 접는다. `teamId`가 있으면 빅6 코드를 되찾고,
 * 내 기록처럼 id 없이 소문자 코드만 올 때는 코드를 대문자로 올려 빅6인지 본다.
 * 로고 URL은 이 응답에 없어 null이고, 빅6는 `TeamCrest`가 로컬 크레스트를 쓴다.
 */
export function toPredictionTeam(team: PredictionTeamResponse): LiveTeam {
  const upper = team.code?.toUpperCase() ?? null;
  const byId = favoriteTeamCode(team.teamId ?? null);
  const code =
    byId ??
    (upper && Object.values(TEAM_CODES).includes(upper as TeamCode)
      ? (upper as TeamCode)
      : null);
  return {
    id: team.teamId ?? null,
    code,
    name: team.name,
    shortName: upper ?? teamShortName(team.name),
    logo: null,
  };
}

function toAuthor(author: PredictionAuthorResponse): PredictionAuthor {
  return {
    userId: author.userId,
    nickname: author.nickname,
    favoriteTeam: favoriteTeamCode(author.favoriteTeamId),
    record: { ...author.record },
  };
}

function toOutcome(
  outcome: PredictionSummaryResponse["outcome"],
): PredictionOutcome | null {
  return outcome && { ...outcome };
}

function toMyPrediction(
  mine: PredictionSummaryResponse["myPrediction"],
): MyPrediction | null {
  return (
    mine && {
      id: mine.predictionId,
      pick: mine.pick,
      opinion: mine.opinion,
      result: mine.result,
      isEdited: mine.isEdited,
    }
  );
}

/** BE → 도메인 경계 변환. 쓰기 액션(PUT)도 같은 응답을 받아 이걸로 접는다. */
export function toPredictionSummary(
  r: PredictionSummaryResponse,
): PredictionSummary {
  return {
    matchId: r.matchId,
    status: r.status,
    opensAt: r.opensAt,
    closesAt: r.closesAt,
    revealed: r.revealed,
    totalCount: r.totalCount,
    distribution: r.distribution && { ...r.distribution },
    myPrediction: toMyPrediction(r.myPrediction),
    outcome: toOutcome(r.outcome),
  };
}

/** BE → 도메인 경계 변환. 의견 하나 조회와 목록 항목이 같은 모양이다. */
export function toPredictionOpinion(
  r: PredictionOpinionResponse,
): PredictionOpinion {
  return {
    id: r.predictionId,
    author: toAuthor(r.author),
    pick: r.pick,
    opinion: r.opinion,
    likeCount: r.likeCount,
    liked: r.likedByMe,
    replyCount: r.replyCount,
    result: r.result,
    isEdited: r.isEdited,
    isDeleted: r.isDeleted,
    createdAt: r.createdAt,
  };
}

function toMyOpinion(
  mine: PredictionOpinionPageResponse["mine"],
): MyPredictionOpinion | null {
  return (
    mine && {
      id: mine.predictionId,
      pick: mine.pick,
      opinion: mine.opinion,
      result: mine.result,
      isEdited: mine.isEdited,
      author: toAuthor(mine.author),
    }
  );
}

/** BE → 도메인 경계 변환. 작성·수정 액션도 같은 응답을 받아 이걸로 접는다. */
export function toPredictionReply(r: PredictionReplyResponse): PredictionReply {
  return {
    id: r.replyId,
    author: { ...r.author },
    authorPick: r.authorPick,
    content: r.content,
    likeCount: r.likeCount,
    liked: r.likedByMe,
    isEdited: r.isEdited,
    isMine: r.isMine,
    createdAt: r.createdAt,
  };
}

function toKeyPlayerSide(side: KeyPlayerSideResponse): KeyPlayerSideInfo {
  return {
    player: side.player && {
      id: side.player.playerId,
      name: side.player.name,
      photo: side.player.photo,
      position: side.player.position,
    },
    votePercent: side.votePercent,
    isDefault: side.isDefault,
    stats: side.stats && {
      appearances: side.stats.appearances,
      goals: side.stats.goals,
      assists: side.stats.assists,
      rating: parseRating(side.stats.rating),
    },
    candidates: side.candidates.map((c) => ({
      id: c.playerId,
      name: c.name,
      photo: c.photo,
      votePercent: c.votePercent,
    })),
  };
}

/** BE → 도메인 경계 변환. 투표 액션(PUT)도 같은 응답을 받아 이걸로 접는다. */
export function toKeyPlayers(r: KeyPlayersResponse): KeyPlayers {
  return {
    status: r.status,
    home: toKeyPlayerSide(r.home),
    away: toKeyPlayerSide(r.away),
    myVote: { ...r.myVote },
  };
}

/**
 * 예측 요약을 가져온다 (`GET /matches/{matchId}/prediction`).
 *
 * 빅6 밖 경기나 일정에 없는 경기는 404 `PREDICTION_NOT_AVAILABLE`이 정상 흐름이라
 * 던지지 않고 null로 돌려준다. 경기 상세가 "예측 탭을 만들 경기인가"를 이 호출로
 * 판별하기 때문이다(토론의 `getArticleDebate`와 같은 판단).
 *
 * @param matchId 경기 id(API-Football fixture id, 라이브 스코어와 같은 체계)
 * @param accessToken 서버에서 부를 때만 - `myPrediction`과 OPEN의 `revealed`가 그 유저 기준으로 온다
 * @throws {ApiError} 404 `PREDICTION_NOT_AVAILABLE` 외의 실패는 그대로 던진다
 */
export async function getPredictionSummary(
  matchId: number,
  { accessToken }: ReadOptions = {},
): Promise<PredictionSummary | null> {
  try {
    const summary = await apiFetch<PredictionSummaryResponse>(
      `/api/v1/matches/${matchId}/prediction`,
      readInit(accessToken, DISTRIBUTION_REVALIDATE_SECONDS),
    );
    return toPredictionSummary(summary);
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.code === "PREDICTION_NOT_AVAILABLE"
    ) {
      return null;
    }
    throw error;
  }
}

/**
 * 의견 한 페이지를 가져온다 (`GET /matches/{matchId}/prediction/opinions`).
 *
 * OPEN에서 예측하지 않은 사용자에게는 200에 `locked: true`와 빈 목록이 온다. 이건
 * 에러가 아니라 화면 상태라 그대로 돌려준다. 차단한 사용자, 블라인드, 삭제된 의견은
 * BE가 뺀 채로 오고, 답글이 남은 삭제 의견만 안내 문구로 남는다. `mine`은 첫
 * 페이지에서만 온다.
 *
 * @param matchId 경기 id
 * @param sort 정렬(기본 적중률순)
 * @param pick 픽 필터. 없으면 전체
 * @param cursor 이전 페이지가 준 `nextCursor`. 첫 페이지면 null
 * @param size 한 페이지 건수(1..50)
 * @param accessToken 서버에서 부를 때만 - 잠금 여부와 `likedByMe`가 그 유저 기준으로 온다
 * @throws {ApiError} 잘못된 정렬·픽·커서는 400으로 온다
 */
export async function getPredictionOpinions(
  matchId: number,
  {
    sort = "accuracy",
    pick = null,
    cursor = null,
    size = PREDICTION_OPINIONS_PAGE_SIZE,
    accessToken,
  }: ReadOptions & {
    sort?: PredictionOpinionSort;
    pick?: PredictionPick | null;
    cursor?: string | null;
    size?: number;
  } = {},
): Promise<PredictionOpinionPage> {
  const params = new URLSearchParams({ sort, size: String(size) });
  if (pick) params.set("pick", pick);
  if (cursor) params.set("cursor", cursor);

  const page = await apiFetch<PredictionOpinionPageResponse>(
    `/api/v1/matches/${matchId}/prediction/opinions?${params}`,
    readInit(accessToken, 0),
  );

  return {
    locked: page.locked,
    mine: toMyOpinion(page.mine),
    items: page.items.map(toPredictionOpinion),
    nextCursor: page.nextCursor,
  };
}

/**
 * 의견 하나를 가져온다 (`GET /predictions/{predictionId}`). 앱 의견 상세와 웹 답글
 * 펼침이 원 의견 전문을 보일 때 쓴다.
 *
 * @param predictionId 의견(예측) id
 * @param accessToken 서버에서 부를 때만
 * @throws {ApiError} OPEN에서 예측하지 않은 사용자는 403 `PREDICTION_LOCKED`,
 *   없는 의견은 404 `PREDICTION_NOT_FOUND`로 온다
 */
export async function getPredictionOpinion(
  predictionId: number,
  { accessToken }: ReadOptions = {},
): Promise<PredictionOpinionDetail> {
  const detail = await apiFetch<
    PredictionOpinionResponse & { matchId: number }
  >(`/api/v1/predictions/${predictionId}`, readInit(accessToken, 0));
  return { ...toPredictionOpinion(detail), matchId: detail.matchId };
}

/**
 * 답글 한 페이지를 가져온다 (`GET /predictions/{predictionId}/replies`, 오래된 순).
 *
 * @param predictionId 의견 id
 * @param cursor 이전 페이지가 준 `nextCursor`. 첫 페이지면 null
 * @param size 한 페이지 건수(1..100)
 * @param accessToken 서버에서 부를 때만 - `likedByMe`·`isMine`이 그 유저 기준으로 온다
 * @throws {ApiError} 잠금 조건은 {@link getPredictionOpinion}과 같다
 */
export async function getPredictionReplies(
  predictionId: number,
  {
    cursor = null,
    size = PREDICTION_REPLIES_PAGE_SIZE,
    accessToken,
  }: ReadOptions & { cursor?: string | null; size?: number } = {},
): Promise<PredictionReplyPage> {
  const params = new URLSearchParams({ size: String(size) });
  if (cursor) params.set("cursor", cursor);

  const page = await apiFetch<{
    items: PredictionReplyResponse[];
    nextCursor: string | null;
  }>(
    `/api/v1/predictions/${predictionId}/replies?${params}`,
    readInit(accessToken, 0),
  );

  return {
    items: page.items.map(toPredictionReply),
    nextCursor: page.nextCursor,
  };
}

/**
 * 키플레이어와 VS 스탯을 가져온다 (`GET /matches/{matchId}/key-players`).
 *
 * 예측 요약과 같은 이유로 404 `PREDICTION_NOT_AVAILABLE`은 null이다. 프리뷰 탭이
 * 키플레이어 묶음을 그릴지 이걸로 정한다.
 *
 * @param matchId 경기 id
 * @param accessToken 서버에서 부를 때만 - `myVote`가 그 유저 기준으로 온다
 */
export async function getKeyPlayers(
  matchId: number,
  { accessToken }: ReadOptions = {},
): Promise<KeyPlayers | null> {
  try {
    const players = await apiFetch<KeyPlayersResponse>(
      `/api/v1/matches/${matchId}/key-players`,
      readInit(accessToken, DISTRIBUTION_REVALIDATE_SECONDS),
    );
    return toKeyPlayers(players);
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.code === "PREDICTION_NOT_AVAILABLE"
    ) {
      return null;
    }
    throw error;
  }
}

/**
 * 홈 승부예측 카드 목록을 가져온다 (`GET /predictions/home`).
 *
 * 오늘부터 7일 안에 킥오프하는 OPEN 경기 전부가 킥오프 순으로 온다. 로그인 사용자는
 * 마이팀 경기가 앞으로 오고, OPEN 경기가 하나도 없으면 가장 최근 SETTLED 경기 하나가
 * 온다. 빈 배열이면 섹션을 그리지 않는다.
 *
 * @param accessToken 서버에서 부를 때만 - `myPick`·`revealed`와 마이팀 정렬이 그 유저 기준이다
 */
export async function getPredictionHome({
  accessToken,
}: ReadOptions = {}): Promise<PredictionHomeCard[]> {
  const { items } = await apiFetch<PredictionHomeResponse>(
    "/api/v1/predictions/home",
    readInit(accessToken, DISTRIBUTION_REVALIDATE_SECONDS),
  );

  return items.map((card) => ({
    matchId: card.matchId,
    kickoffAt: card.kickoffAt,
    competition: card.competition,
    home: toPredictionTeam(card.home),
    away: toPredictionTeam(card.away),
    status: card.status,
    revealed: card.revealed,
    totalCount: card.totalCount,
    distribution: card.distribution && { ...card.distribution },
    myPick: card.myPick,
    topOpinion: card.topOpinion && { ...card.topOpinion },
    outcome: toOutcome(card.outcome),
  }));
}

/**
 * 시즌 랭킹 한 페이지를 가져온다 (`GET /predictions/rankings`).
 *
 * 정산 5경기 이상인 사용자만 오른다. `me`는 첫 페이지에서 쓰고 비로그인이면 null이다.
 *
 * @param scope 시즌(`2026`) 또는 `ALL`. 기본은 이번 시즌
 * @param cursor 이전 페이지가 준 `nextCursor`. 첫 페이지면 null
 * @param size 한 페이지 건수(1..100)
 * @param accessToken 서버에서 부를 때만 - `me`가 채워진다
 */
export async function getPredictionRankings({
  scope = "2026",
  cursor = null,
  size = PREDICTION_RANKINGS_PAGE_SIZE,
  accessToken,
}: ReadOptions & {
  scope?: string;
  cursor?: string | null;
  size?: number;
} = {}): Promise<PredictionRanking> {
  const params = new URLSearchParams({ scope, size: String(size) });
  if (cursor) params.set("cursor", cursor);

  const page = await apiFetch<PredictionRankingResponse>(
    `/api/v1/predictions/rankings?${params}`,
    readInit(accessToken, RANKING_REVALIDATE_SECONDS),
  );

  return {
    scope: page.scope,
    items: page.items.map((row) => ({
      rank: row.rank,
      userId: row.userId,
      nickname: row.nickname,
      favoriteTeam: favoriteTeamCode(row.favoriteTeamId),
      record: {
        settled: row.settled,
        hits: row.hits,
        rate: row.rate,
        streak: row.streak,
      },
    })),
    me: page.me && {
      rank: page.me.rank,
      record: {
        settled: page.me.settled,
        hits: page.me.hits,
        rate: page.me.rate,
        streak: page.me.streak,
      },
      qualified: page.me.qualified,
      remaining: page.me.remaining,
    },
    nextCursor: page.nextCursor,
  };
}

/**
 * 내 적중 기록을 가져온다 (`GET /me/prediction-stats`). 로그인 전용이라 서버에서는
 * 토큰을 꼭 넘긴다.
 *
 * @param accessToken 서버에서 부를 때 넘긴다
 * @throws {ApiError} 토큰이 없거나 만료면 401 `AUTH_REQUIRED`
 */
export async function getMyPredictionStats({
  accessToken,
}: ReadOptions = {}): Promise<MyPredictionStats> {
  const stats = await apiFetch<MyPredictionStatsResponse>(
    "/api/v1/me/prediction-stats",
    readInit(accessToken, 0),
  );
  return {
    season: { ...stats.season },
    all: { ...stats.all },
    predictionCount: stats.predictionCount,
  };
}

/**
 * 내 예측 기록 한 페이지를 가져온다 (`GET /me/predictions`). 진행 중(OPEN, LOCKED)이
 * 먼저, 그다음 정산된 것이 킥오프 역순이다.
 *
 * @param cursor 이전 페이지가 준 `nextCursor`. 첫 페이지면 null
 * @param size 한 페이지 건수(1..50)
 * @param accessToken 서버에서 부를 때 넘긴다
 * @throws {ApiError} 토큰이 없거나 만료면 401 `AUTH_REQUIRED`
 */
export async function getMyPredictions({
  cursor = null,
  size = MY_PREDICTIONS_PAGE_SIZE,
  accessToken,
}: ReadOptions & {
  cursor?: string | null;
  size?: number;
} = {}): Promise<MyPredictionPage> {
  const params = new URLSearchParams({ size: String(size) });
  if (cursor) params.set("cursor", cursor);

  const page = await apiFetch<MyPredictionsResponse>(
    `/api/v1/me/predictions?${params}`,
    readInit(accessToken, 0),
  );

  return {
    items: page.items.map(
      (entry): MyPredictionEntry => ({
        id: entry.predictionId,
        matchId: entry.matchId,
        kickoffAt: entry.kickoffAt,
        home: toPredictionTeam(entry.home),
        away: toPredictionTeam(entry.away),
        status: entry.status,
        pick: entry.pick,
        result: entry.result,
        score: entry.score && { ...entry.score },
      }),
    ),
    nextCursor: page.nextCursor,
  };
}

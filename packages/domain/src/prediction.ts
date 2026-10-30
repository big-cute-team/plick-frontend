/**
 * @file 승부예측 도메인 타입과 순수 헬퍼 (KAN-695, BE `docs/specs/prediction-api.md`).
 *
 * 웹이 첫 사용처지만 모바일도 같은 계약을 쓸 기능이라 앱 폴더를 거치지 않고 바로
 * 여기 둔다(ADR 0011 게이트 C, 토론·라이브와 같은 판단). BE 응답 모양은
 * `@plick/core/predictions`가 로컬로 들고 있고 화면은 이 타입만 본다.
 *
 * 팀은 라이브 스코어의 {@link LiveTeam}을 그대로 쓴다. 홈 카드와 내 기록이 주는 팀은
 * 빅6 밖(`teamId: null`)도 있어서 코드만으로는 모자라고, 라이브 카드가 이미 같은 문제를
 * 푼 모양(코드 + 3글자 약어 + 전체 이름)이라 새 타입을 만들지 않는다.
 */

import type { LiveTeam } from "./live";
import type { CommentReportReason, LikeState, TeamCode } from "./types";

/**
 * 경기 하나의 예측 상태. 저장하지 않고 일정과 정산 기록으로 그때그때 계산한 값이다.
 * - UPCOMING: 킥오프 7일 전보다 이르다. 쓰기 불가, 분포와 의견 비공개
 * - OPEN: 킥오프 7일 전부터 킥오프까지. 등록, 수정, 취소가 된다
 * - LOCKED: 킥오프 뒤, 정산 전. 모두 공개
 * - SETTLED: 정산 완료. 적중 여부까지 공개
 * - VOID: 취소, 중단, 몰수. 적중 기록에서 뺀다. 연기(POSTPONED)는 VOID가 아니다
 */
export type PredictionStatus =
  | "UPCOMING"
  | "OPEN"
  | "LOCKED"
  | "SETTLED"
  | "VOID";

/** 승무패 픽이자 정산된 경기 결과. */
export type PredictionPick = "HOME" | "DRAW" | "AWAY";

/** 예측 한 건의 적중 결과. 정산 전은 PENDING, 경기가 무효면 VOID. */
export type PredictionResult = "PENDING" | "HIT" | "MISS" | "VOID";

/** 의견 목록 정렬. BE 쿼리 파라미터 값 그대로다. 기본은 적중률순. */
export type PredictionOpinionSort = "accuracy" | "latest" | "likes";

/** 키플레이어 투표의 팀 쪽. */
export type KeyPlayerSide = "HOME" | "AWAY";

/** 예측 의견·답글 신고 사유. 댓글 신고와 같은 BE enum을 쓴다. */
export type PredictionReportReason = CommentReportReason;

/** 승, 무, 패 분포(정수 퍼센트). 세 값의 합은 서버가 100으로 맞춘다. */
export interface PredictionDistribution {
  home: number;
  draw: number;
  away: number;
}

/**
 * 정산 결과. SETTLED면 스코어와 "이 경기 예측자 중 적중 비율"이 오고, VOID면
 * `result: "VOID"`에 나머지는 null이다.
 */
export interface PredictionOutcome {
  result: PredictionPick | "VOID";
  homeGoals: number | null;
  awayGoals: number | null;
  /** 이 경기 예측자 중 적중 비율(퍼센트). 홈 카드 "예측한 사람 중 55% 적중" */
  hitRate: number | null;
}

/** 내가 이 경기에 낸 예측. 블라인드된 의견은 BE가 본문을 안내 문구로 바꿔 준다. */
export interface MyPrediction {
  id: number;
  pick: PredictionPick;
  opinion: string;
  result: PredictionResult;
  isEdited: boolean;
}

/**
 * 예측 요약(`GET /matches/{id}/prediction`). 예측 탭 상단과 프리뷰 묶음이 쓴다.
 *
 * `revealed`가 false면 `totalCount`와 `distribution`이 null이다. OPEN에서 내가
 * 아직 예측하지 않았거나 UPCOMING일 때이고, 화면은 숫자를 만들지 않고 `?%`로 그린다.
 * 서버가 막는 값이라 FE 블러만으로 가리지 않는다.
 */
export interface PredictionSummary {
  matchId: number;
  status: PredictionStatus;
  opensAt: string;
  /** 마감(킥오프) 시각. 화면에 남은 시간은 표시하지 않지만 계약에 남아 있다 */
  closesAt: string | null;
  revealed: boolean;
  totalCount: number | null;
  distribution: PredictionDistribution | null;
  myPrediction: MyPrediction | null;
  outcome: PredictionOutcome | null;
}

/** 통산 적중 기록. 의견 행의 "24전 17적중 71%"와 랭킹 행이 쓴다. */
export interface PredictionRecord {
  settled: number;
  hits: number;
  /** 적중률 퍼센트(정수). 정산 0이면 0 */
  rate: number;
  streak: number;
}

/** 의견 작성자. 마이팀은 빅6 코드로 접어 두어 `TeamCrest`에 바로 넣는다. */
export interface PredictionAuthor {
  userId: number;
  nickname: string;
  favoriteTeam: TeamCode | null;
  record: PredictionRecord;
}

/**
 * 의견 한 건. 답글이 남은 삭제 의견은 `isDeleted: true`에 본문이 안내 문구이고
 * `pick`과 `result`가 null이라 화면은 픽 배지와 적중 표시를 뺀다.
 */
export interface PredictionOpinion {
  id: number;
  author: PredictionAuthor;
  pick: PredictionPick | null;
  opinion: string;
  likeCount: number;
  liked: boolean;
  replyCount: number;
  result: PredictionResult | null;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
}

/** 의견 하나 조회(`GET /predictions/{id}`). 목록 항목에 경기 id를 더한 것. */
export interface PredictionOpinionDetail extends PredictionOpinion {
  matchId: number;
}

/** 의견 목록 첫 페이지에만 실리는 내 의견. 목록 `items`에는 없다. */
export interface MyPredictionOpinion {
  id: number;
  pick: PredictionPick;
  opinion: string;
  result: PredictionResult;
  isEdited: boolean;
  author: PredictionAuthor;
}

/**
 * 의견 목록 한 페이지. `locked`가 true면 OPEN에서 예측하지 않은 사용자라 `items`가 비고
 * `mine`도 null이다. 화면은 가짜 행 서너 개에 블러를 걸고 작성을 유도한다.
 */
export interface PredictionOpinionPage {
  locked: boolean;
  mine: MyPredictionOpinion | null;
  items: PredictionOpinion[];
  nextCursor: string | null;
}

/** 답글 한 건. 1단계만 있고 답글의 답글은 본문 앞 `@닉네임`이다. */
export interface PredictionReply {
  id: number;
  author: { userId: number; nickname: string };
  /** 작성자가 이 경기에 낸 픽. 예측하지 않았으면 null이라 배지를 뺀다 */
  authorPick: PredictionPick | null;
  content: string;
  likeCount: number;
  liked: boolean;
  isEdited: boolean;
  isMine: boolean;
  createdAt: string;
}

/** 답글 목록 한 페이지(오래된 순). */
export interface PredictionReplyPage {
  items: PredictionReply[];
  nextCursor: string | null;
}

/** 키플레이어 한 명. */
export interface KeyPlayer {
  id: number;
  name: string;
  photo: string | null;
  position: string | null;
}

/** 키플레이어 시즌 스탯(이번 시즌 이 대회 기준). 평점은 문자열을 숫자로 접는다. */
export interface KeyPlayerStats {
  appearances: number;
  goals: number;
  assists: number;
  rating: number | null;
}

/** 키플레이어 후보 한 명. 직전 선발 11명이 먼저, 득표율 내림차순. */
export interface KeyPlayerCandidate {
  id: number;
  name: string;
  photo: string | null;
  votePercent: number;
}

/** 한 팀의 키플레이어 묶음. 표가 없으면 시즌 평점 1위가 `isDefault: true`로 온다. */
export interface KeyPlayerSideInfo {
  player: KeyPlayer | null;
  votePercent: number;
  isDefault: boolean;
  stats: KeyPlayerStats | null;
  candidates: KeyPlayerCandidate[];
}

/** 키플레이어와 VS 스탯(`GET /matches/{id}/key-players`). */
export interface KeyPlayers {
  status: PredictionStatus;
  home: KeyPlayerSideInfo;
  away: KeyPlayerSideInfo;
  /** 팀별 내 표(선수 id). 없으면 null */
  myVote: { home: number | null; away: number | null };
}

/**
 * 홈 승부예측 카드 한 장(`GET /predictions/home`). `topOpinion`은 적중률순 1위 의견의
 * 앞 40자다. `revealed: false`여도 내려오는 미끼 문구라 예측 전에는 화면이 꼭 블러를 건다.
 */
export interface PredictionHomeCard {
  matchId: number;
  kickoffAt: string;
  competition: string;
  home: LiveTeam;
  away: LiveTeam;
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
  outcome: PredictionOutcome | null;
}

/** 시즌 랭킹 한 행. 정산 5경기 이상만 오른다. */
export interface PredictionRankRow {
  rank: number;
  userId: number;
  nickname: string | null;
  favoriteTeam: TeamCode | null;
  record: PredictionRecord;
}

/**
 * 랭킹의 내 줄. `qualified: false`면 `rank`가 null이고 `remaining`이 정산까지 남은
 * 경기 수라 화면은 순위 칸에 `3/5`처럼 남은 정도를 그린다.
 */
export interface MyPredictionRank {
  rank: number | null;
  record: PredictionRecord;
  qualified: boolean;
  remaining: number;
}

/** 시즌 랭킹 한 페이지(`GET /predictions/rankings`). 비로그인은 `me`가 null. */
export interface PredictionRanking {
  scope: string;
  items: PredictionRankRow[];
  me: MyPredictionRank | null;
  nextCursor: string | null;
}

/** 내 적중 기록(`GET /me/prediction-stats`). MY 기록 상자와 띠가 쓴다. */
export interface MyPredictionStats {
  season: PredictionRecord & {
    bestStreak: number;
    rank: number | null;
    qualified: boolean;
  };
  all: Pick<PredictionRecord, "settled" | "hits" | "rate">;
  /** 이번 시즌 등록한 예측 수(정산 전 포함, 취소 제외) */
  predictionCount: number;
}

/** 내 예측 기록 한 행(`GET /me/predictions`). 진행 중이 먼저, 정산된 것은 킥오프 역순. */
export interface MyPredictionEntry {
  id: number;
  matchId: number;
  kickoffAt: string;
  home: LiveTeam;
  away: LiveTeam;
  status: PredictionStatus;
  pick: PredictionPick;
  result: PredictionResult;
  /** SETTLED면 정규시간 스코어, 아니면 null */
  score: { home: number; away: number } | null;
}

/** 내 예측 기록 한 페이지. */
export interface MyPredictionPage {
  items: MyPredictionEntry[];
  nextCursor: string | null;
}

/** 공감 등록·취소 뒤 BE가 돌려주는 상태. 좋아요의 {@link LikeState}와 같은 모양이다. */
export type PredictionLikeState = LikeState;

/**
 * 승부예측 서버 액션의 결과. 값으로 돌려주는 이유는 댓글 액션과 같다. 서버 액션이
 * 던진 에러는 프로덕션에서 메시지가 가려져 클라가 BE 에러 code로 분기할 수 없다.
 * 클라 훅이 실패 값을 `ApiError`로 되살려 던지고 `classifyPredictionError`로 나눈다.
 */
export type PredictionActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; code: string; message: string };

/** 의견 최소 글자 수(앞뒤 공백 제외). BE 검증과 같은 값이다. */
export const PREDICTION_OPINION_MIN_LENGTH = 5;

/** 의견·답글 최대 글자 수. 입력은 여기서 자르고 BE가 최종 검증한다. */
export const PREDICTION_TEXT_MAX_LENGTH = 300;

/** 의견 한 페이지 건수(BE 기본값, 상한 50). */
export const PREDICTION_OPINIONS_PAGE_SIZE = 20;

/** 답글 한 페이지 건수(BE 기본값, 상한 100). */
export const PREDICTION_REPLIES_PAGE_SIZE = 50;

/** 랭킹 한 페이지 건수(BE 기본값, 상한 100). */
export const PREDICTION_RANKINGS_PAGE_SIZE = 50;

/** 내 예측 기록 한 페이지 건수(BE 기본값, 상한 50). */
export const MY_PREDICTIONS_PAGE_SIZE = 20;

/**
 * 분포 재조회 간격(ms). BE가 분포를 30초 캐시하므로 진행 중 경기 예측 탭에 머물면
 * 이 간격으로 요약을 다시 받는다.
 */
export const PREDICTION_DISTRIBUTION_REFRESH_MS = 30_000;

/** 랭킹 신선도(ms). BE가 10분 캐시하므로 그보다 자주 받을 이유가 없다. */
export const PREDICTION_RANKING_STALE_MS = 10 * 60_000;

/**
 * 작성 중인 의견을 경기별로 임시 저장하는 localStorage 키. 닫았다 열면 살리고
 * 등록, 취소 성공 시 지운다.
 *
 * @param matchId 경기 id
 */
export function predictionDraftKey(matchId: number): string {
  return `plick:pred-draft:${matchId}`;
}

/**
 * 의견·답글 글자 수. BE와 같은 기준으로 앞뒤 공백을 뺀 뒤 코드포인트로 센다.
 * `length`는 이모지 같은 서로게이트 쌍을 둘로 세서 BE 판정과 어긋난다.
 *
 * @param text 입력 원문
 */
export function predictionTextLength(text: string): number {
  return Array.from(text.trim()).length;
}

/**
 * 등록 버튼을 켤 수 있는 의견인가. 픽 선택과 금칙어 판정은 밖에서 한다.
 * 금칙어는 BE만 알아 등록 시 400 `PREDICTION_OPINION_BLOCKED`로 돌아온다.
 *
 * @param opinion 입력 원문
 */
export function isPredictionOpinionLengthValid(opinion: string): boolean {
  const length = predictionTextLength(opinion);
  return (
    length >= PREDICTION_OPINION_MIN_LENGTH &&
    length <= PREDICTION_TEXT_MAX_LENGTH
  );
}

/**
 * 적중 기록 표기. 정산 0이면 `첫 예측`, 1~4는 `n전 m적중`, 5 이상은 퍼센트까지 붙인다.
 * 네 경기까지는 표본이 작아 퍼센트가 과장돼 보이고, 랭킹 자격(정산 5경기)과 선을 맞춘다.
 *
 * @param record 작성자나 랭킹 행의 기록
 * @example formatPredictionRecord({ settled: 24, hits: 17, rate: 71, streak: 3 }) // "24전 17적중 71%"
 */
export function formatPredictionRecord(
  record: Pick<PredictionRecord, "settled" | "hits" | "rate">,
): string {
  if (record.settled === 0) return "첫 예측";
  const base = `${record.settled}전 ${record.hits}적중`;
  return record.settled < 5 ? base : `${base} ${record.rate}%`;
}

/**
 * 참여 수 표기. 비공개(`revealed: false`)면 숫자 대신 물음표다.
 *
 * @param totalCount 요약의 `totalCount`
 * @example formatPredictionCount(1284) // "1,284명 예측"
 * @example formatPredictionCount(null) // "?명 예측"
 */
export function formatPredictionCount(totalCount: number | null): string {
  return totalCount === null
    ? "?명 예측"
    : `${totalCount.toLocaleString("ko-KR")}명 예측`;
}

/**
 * 분포 칸 값 표기. 비공개면 `?%`.
 *
 * @param percent 분포 한 칸의 퍼센트, 비공개면 null
 */
export function formatPredictionPercent(percent: number | null): string {
  return percent === null ? "?%" : `${percent}%`;
}

/**
 * 적중 기록 `19/25` 표기(랭킹 적중 칸, MY 기록 상자).
 *
 * @param record 기록
 */
export function formatPredictionHits(
  record: Pick<PredictionRecord, "settled" | "hits">,
): string {
  return `${record.hits}/${record.settled}`;
}

/**
 * 예측을 쓰거나 고칠 수 있는 상태인가. 서버가 최종 판정하지만 버튼을 그릴지 정하는 데 쓴다.
 *
 * @param status 요약의 상태
 */
export function isPredictionOpen(status: PredictionStatus): boolean {
  return status === "OPEN";
}

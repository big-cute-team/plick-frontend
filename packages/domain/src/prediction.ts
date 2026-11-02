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

/**
 * 신고 대상. 의견(`POST /predictions/{id}/report`)과 답글(`POST /prediction-replies/{id}/report`)은
 * 사유와 실패 규약이 같고 경로만 달라 신고 시트·팝업 하나가 둘을 받는다(KAN-698).
 */
export type PredictionReportTarget =
  | { kind: "opinion"; id: number }
  | { kind: "reply"; id: number };

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
 * 등록 버튼을 켤 수 있는 답글인가(KAN-698, 티켓 완료 조건 "본문 1자 이상 300자 이하"). 의견과
 * 달리 최소 한 글자다. 금칙어는 BE만 알아 400 `PREDICTION_REPLY_BLOCKED`로 돌아온다.
 *
 * @param content 입력 원문
 */
export function isPredictionReplyLengthValid(content: string): boolean {
  const length = predictionTextLength(content);
  return length >= 1 && length <= PREDICTION_TEXT_MAX_LENGTH;
}

/**
 * 답장할 때 입력창에 채우는 머리말(시안 가이드 §5.6 "답장: 입력창에 `@닉네임 `을 채운다"). 답글은
 * 1단계뿐이라 누구에게 하는 말인지는 이 머리말이 전부다. BE에 따로 보내는 값은 없다.
 *
 * @param nickname 답장 대상 닉네임
 * @example predictionReplyMention("레드데블스") // "@레드데블스 "
 */
export function predictionReplyMention(nickname: string): string {
  return `@${nickname} `;
}

/**
 * 답글 입력창 안내(KAN-698, 티켓 완료 조건 "입력창 안내 문구는 내 픽과 원 의견 픽이 같은지로
 * 분기"). 예측하지 않았거나 원 의견이 지워져 픽이 없으면 기본 문구다. 같은 픽이면 근거를
 * 보태는 쪽, 다른 픽이면 반론을 남기는 쪽으로 말을 건다. 의견과 답글은 "논쟁"이 목적이라
 * 여기만 설명체 금지 규칙의 예외로 둔다.
 *
 * @param myPick 내 픽. 예측하지 않았으면 null
 * @param opinionPick 원 의견의 픽. 지워진 의견이면 null
 * @example predictionReplyPlaceholder("HOME", "HOME") // "같은 픽에 의견 보태기"
 * @example predictionReplyPlaceholder("HOME", "AWAY") // "다른 픽에 반론 남기기"
 * @example predictionReplyPlaceholder(null, "AWAY") // "답글 입력"
 */
export function predictionReplyPlaceholder(
  myPick: PredictionPick | null,
  opinionPick: PredictionPick | null,
): string {
  if (!myPick || !opinionPick) return "답글 입력";
  return myPick === opinionPick
    ? "같은 픽에 의견 보태기"
    : "다른 픽에 반론 남기기";
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

/** 세 픽의 고정 순서. 3분할 바, 픽 버튼, 분포 칸이 모두 홈, 무, 원정 순으로 선다. */
export const PREDICTION_PICKS: readonly PredictionPick[] = [
  "HOME",
  "DRAW",
  "AWAY",
] as const;

/**
 * 의견 목록 정렬 선택지와 라벨(시안 가이드 §5.4). BE 쿼리 값과 화면 카피가 한 쌍이라
 * `COMMENT_REPORT_REASONS`처럼 도메인에 둔다. 순서가 곧 화면 순서다.
 */
export const PREDICTION_OPINION_SORTS: readonly {
  value: PredictionOpinionSort;
  label: string;
}[] = [
  { value: "accuracy", label: "적중률순" },
  { value: "latest", label: "최신순" },
  { value: "likes", label: "공감순" },
];

/**
 * 의견 픽 필터 칩의 순서(시안 가이드 §5.4 "전체, 다른 픽 둘, 내 픽 순"). 전체는 null이고
 * 호출부가 맨 앞에 둔다. 예측한 사람에게는 반대 픽이 먼저 오고 내 픽이 마지막이다. 내 의견은
 * 상자로 따로 서 있어 내 픽 칩은 "나와 같은 쪽"을 볼 때만 쓰니 뒤로 보낸다.
 *
 * @param myPick 내 픽. 없으면 홈, 무, 원정 순 그대로
 * @example predictionFilterPicks("AWAY") // ["HOME", "DRAW", "AWAY"]
 * @example predictionFilterPicks("HOME") // ["DRAW", "AWAY", "HOME"]
 */
export function predictionFilterPicks(
  myPick: PredictionPick | null,
): PredictionPick[] {
  if (!myPick) return [...PREDICTION_PICKS];
  return [...PREDICTION_PICKS.filter((pick) => pick !== myPick), myPick];
}

/**
 * 의견 목록 빈 상태 문구(시안 가이드 §5.4·§7). 픽 필터가 걸려 있으면 그 픽이 없다는 뜻이고,
 * 필터 없이 비었는데 내 의견이 있으면 남의 의견만 없는 것이다.
 *
 * @param pickFilter 걸린 픽 필터. 전체면 null
 * @param hasMine 내 의견이 있는가
 */
export function predictionOpinionsEmptyText(
  pickFilter: PredictionPick | null,
  hasMine: boolean,
): string {
  if (pickFilter) return "이 픽의 의견이 없어요";
  return hasMine ? "다른 의견이 없어요" : "아직 의견이 없어요";
}

/**
 * 픽 라벨. 홈과 원정은 `팀명 승`, 무승부는 그대로다. 픽 버튼, 내 예측 배지, MY 기록
 * `내 예측 맨시티 승`이 같은 표기를 쓴다.
 *
 * @param pick 픽
 * @param teams 홈·원정 팀명
 * @example predictionPickLabel("AWAY", { home: "맨유", away: "맨시티" }) // "맨시티 승"
 */
export function predictionPickLabel(
  pick: PredictionPick,
  teams: { home: string; away: string },
): string {
  if (pick === "HOME") return `${teams.home} 승`;
  if (pick === "AWAY") return `${teams.away} 승`;
  return "무승부";
}

/**
 * 분포 한 칸의 값. 비공개(`distribution: null`)면 null이라 `?%`로 그린다.
 *
 * @param distribution 요약의 분포
 * @param pick 칸
 */
export function predictionPercentOf(
  distribution: PredictionDistribution | null,
  pick: PredictionPick,
): number | null {
  if (!distribution) return null;
  if (pick === "HOME") return distribution.home;
  if (pick === "DRAW") return distribution.draw;
  return distribution.away;
}

/**
 * 예측이 열리는 시각 표기(`9월 14일 22:30 열림`). UPCOMING 상태 줄이다. 라이브의
 * `kickoffDateLabel`은 요일을 붙이는데 시안 상태 줄은 요일이 없어 따로 만든다.
 *
 * @param opensAt 요약의 `opensAt`(ISO, KST 오프셋)
 * @example formatPredictionOpensAt("2026-09-14T22:30:00+09:00") // "9월 14일 22:30 열림"
 */
export function formatPredictionOpensAt(opensAt: string): string {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(opensAt));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("month")}월 ${get("day")}일 ${hour}:${get("minute")} 열림`;
}

/**
 * 예측 탭 상단 상태 줄(시안 가이드 §4). OPEN은 상태 줄이 없어 null이다.
 * SETTLED는 스코어와 이긴 쪽(`결과 1 - 2 맨시티 승`, 무승부면 `결과 1 - 1 무승부`)이고,
 * 정산 정보가 아직 없으면 `결과 확정`만 적는다.
 *
 * @param summary 예측 요약
 * @param teams 홈·원정 팀명
 */
export function predictionStatusLine(
  summary: Pick<PredictionSummary, "status" | "outcome"> & {
    /** 열림 시각. 홈 카드처럼 UPCOMING이 오지 않는 자리는 비워도 된다 */
    opensAt?: string;
  },
  teams: { home: string; away: string },
): string | null {
  switch (summary.status) {
    case "UPCOMING":
      return summary.opensAt ? formatPredictionOpensAt(summary.opensAt) : null;
    case "OPEN":
      return null;
    case "LOCKED":
      return "예측 마감";
    case "VOID":
      return "경기 취소, 적중 기록 제외";
    case "SETTLED": {
      const outcome = summary.outcome;
      if (
        !outcome ||
        outcome.result === "VOID" ||
        outcome.homeGoals === null ||
        outcome.awayGoals === null
      ) {
        return "결과 확정";
      }
      const winner = predictionPickLabel(outcome.result, teams);
      return `결과 ${outcome.homeGoals} - ${outcome.awayGoals} ${winner}`;
    }
  }
}

/**
 * 내 예측의 적중 표기. 정산 전(PENDING)과 무효(VOID)는 표기가 없다.
 *
 * @param result 예측 결과
 */
export function predictionVerdictLabel(
  result: PredictionResult | null | undefined,
): "적중" | "빗나감" | null {
  if (result === "HIT") return "적중";
  if (result === "MISS") return "빗나감";
  return null;
}

/**
 * 작성 중인 예측의 임시 저장 값. 픽까지 함께 둬서 비로그인이 로그인하고 돌아왔을 때
 * 고른 픽이 살아 있게 한다(티켓 완료 조건 "로그인 뒤 고른 픽 유지").
 */
export interface PredictionDraft {
  pick: PredictionPick | null;
  opinion: string;
}

/**
 * 임시 저장 값을 되살린다. 모양이 어긋난 값(옛 포맷, 손으로 고친 값)은 버린다.
 *
 * @param raw localStorage에서 읽은 문자열
 */
export function parsePredictionDraft(
  raw: string | null | undefined,
): PredictionDraft | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const { pick, opinion } = value as Record<string, unknown>;
    const validPick =
      pick === null || PREDICTION_PICKS.includes(pick as PredictionPick);
    if (!validPick || typeof opinion !== "string") return null;
    return {
      pick: pick as PredictionPick | null,
      opinion: opinion.slice(0, PREDICTION_TEXT_MAX_LENGTH),
    };
  } catch {
    return null;
  }
}

/** 경기 상세 URL에서 처음 열 탭을 고르는 쿼리 이름. */
export const PREDICTION_TAB_QUERY = "tab";

/** 그 쿼리에 실어 예측 탭을 가리키는 값. 경기 상세가 같은 값으로 비교한다. */
export const PREDICTION_TAB_VALUE = "prediction";

/**
 * 경기 상세 예측 탭을 바로 여는 경로(시안 가이드 §3 "홈 카드, 투표 탭 경기 행, MY 기록 행에서 들어오면
 * 예측 탭으로 바로 연다"). 경기 상세 화면이 마운트 뒤 이 쿼리를 읽어 예측 탭을 고른다(KAN-700).
 *
 * @param matchId 경기 id
 * @example matchPredictionPath(1208345) // "/live/matches/1208345?tab=prediction"
 */
export function matchPredictionPath(matchId: number): string {
  return `/live/matches/${matchId}?${PREDICTION_TAB_QUERY}=${PREDICTION_TAB_VALUE}`;
}

/**
 * 홈 카드의 킥오프 표기(시안 가이드 §5.2 `오늘 22:30`, `9월 22일 20:30`). KST 기준 같은 날이면 `오늘`,
 * 아니면 월일이다. 토론 마감의 `formatDebateCloseAt`과 같은 규칙인데 그쪽은 `마감`이 붙는다.
 *
 * @param kickoffAt 킥오프 시각 ISO (KST 오프셋)
 * @param now 비교 기준. 테스트에서 고정값을 넣는다
 * @example predictionKickoffLabel("2026-09-22T20:30:00+09:00", new Date("2026-09-22T10:00:00+09:00")) // "오늘 20:30"
 */
export function predictionKickoffLabel(
  kickoffAt: string,
  now: Date = new Date(),
): string {
  const at = new Date(kickoffAt);
  if (Number.isNaN(at.getTime())) return "";
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const hour = get("hour") === "24" ? "00" : get("hour");
  const time = `${hour}:${get("minute")}`;
  const dayKey = (d: Date) =>
    new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      dateStyle: "short",
    }).format(d);
  if (dayKey(at) === dayKey(now)) return `오늘 ${time}`;
  return `${get("month")}월 ${get("day")}일 ${time}`;
}

/**
 * 홈 카드 맨 아래 줄(시안 가이드 §7). 정산된 카드는 `예측한 사람 중 55% 적중`, 나머지는 참여 수다.
 * 비공개면 `?명 예측`.
 *
 * @param card 홈 카드
 */
export function predictionHomeFooter(
  card: Pick<PredictionHomeCard, "status" | "outcome" | "totalCount">,
): string {
  const hitRate = card.status === "SETTLED" ? card.outcome?.hitRate : null;
  if (hitRate !== null && hitRate !== undefined) {
    return `예측한 사람 중 ${hitRate}% 적중`;
  }
  return formatPredictionCount(card.totalCount);
}

/**
 * 홈 카드의 내 결과(`적중`, `빗나감`). 정산된 경기에 내 픽이 있을 때만이고 요약과 달리 카드는
 * `result`를 안 주니 픽과 결과를 맞춰 본다. 무효 경기는 null이다.
 *
 * @param card 홈 카드
 */
export function predictionHomeVerdict(
  card: Pick<PredictionHomeCard, "status" | "myPick" | "outcome">,
): "적중" | "빗나감" | null {
  if (card.status !== "SETTLED" || !card.myPick || !card.outcome) return null;
  if (card.outcome.result === "VOID") return null;
  return card.myPick === card.outcome.result ? "적중" : "빗나감";
}

/**
 * 홈 승부예측 제목 오른쪽의 내 순위 표기(시안 가이드 §2 "128위 >", 비로그인은 "랭킹 >"). 로그인했지만
 * 아직 자격이 안 되면(정산 5경기 미만, `rank: null`) 랭킹으로만 적는다.
 *
 * @param stats 내 기록. 비로그인이나 게스트, 못 받았으면 null
 */
export function predictionRankLabel(
  stats: Pick<MyPredictionStats, "season"> | null,
): string {
  const rank = stats?.season.rank ?? null;
  return rank === null ? "랭킹" : `${rank}위`;
}

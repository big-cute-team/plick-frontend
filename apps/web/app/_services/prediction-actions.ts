"use server";

/**
 * @file 승부예측 쓰기 서버 액션 12종 (KAN-695, BE `docs/specs/prediction-api.md` §4).
 *
 * 보호 API라 HttpOnly 쿠키의 access 토큰을 Bearer로 실어야 하는데 클라는 그
 * 쿠키를 못 읽으므로 서버 액션을 경유한다. 댓글·토론·신고 액션과 같은 이유, 같은
 * 모양이다. 읽기 fetcher(`@plick/core/predictions`)와 파일이 갈린 건 `"use server"`
 * 파일이 async 함수만 export할 수 있어서다. 쿠키 이름이 앱에 박혀 있어 승격하지 않고
 * 모바일이 붙을 때 복제한다.
 *
 * 결과는 던지지 않고 값으로 돌려준다. 서버 액션이 던진 에러는 프로덕션에서 메시지가
 * 가려져 클라가 BE 에러 code로 분기할 수 없다. 클라 훅이 실패 값을 `ApiError`로
 * 되살려 던지고 `classifyPredictionError`가 종류를 가른다. 비로그인(쿠키 없음)은
 * BE까지 안 가고 401 `AUTH_REQUIRED`로 돌려주고, 게스트는 BE가 403
 * `AUTH_GUEST_FORBIDDEN`으로 거절한다. 공감 둘(의견, 답글)과 키플레이어 투표만
 * 게스트도 된다.
 *
 * 멱등성: 예측 등록(PUT)은 사용자당 경기당 1건 UPSERT라 다시 부르면 픽과 의견을
 * 바꾼다. 공감 POST·DELETE는 이미 눌렀거나 안 누른 상태에 또 보내도 200에 현재
 * 값이 온다. 키플레이어 투표는 팀별 1표 UPSERT다.
 */

import { cookies } from "next/headers";
import { ApiError, apiFetch } from "@plick/core/client";
import {
  toKeyPlayers,
  toPredictionReply,
  toPredictionSummary,
  type KeyPlayersResponse,
  type PredictionReplyResponse,
  type PredictionSummaryResponse,
} from "@plick/core/predictions";
import type {
  KeyPlayerSide,
  KeyPlayers,
  PredictionActionResult,
  PredictionLikeState,
  PredictionPick,
  PredictionReply,
  PredictionReportReason,
  PredictionSummary,
} from "@plick/domain/prediction";
import { AUTH_COOKIES } from "@/_constants/api";

/** 비로그인(쿠키 없음)에 BE까지 가지 않고 돌려주는 실패. 댓글 액션과 같은 값이다. */
const AUTH_REQUIRED: PredictionActionResult<never> = {
  ok: false,
  status: 401,
  code: "AUTH_REQUIRED",
  message: "로그인이 필요합니다.",
};

/**
 * 액션이 만든 BE 경로가 가질 수 있는 모양. 서버 액션은 브라우저가 인자를 마음대로 넣어
 * 부를 수 있어 id 자리에 `1/../x` 같은 값이 와도 경로에 그대로 들어간다. 숫자 id와
 * 고정 세그먼트만 허용해 그런 값은 BE까지 가지 않게 막는다.
 */
const SAFE_PATH = /^\/api\/v1\/[a-z0-9\-/]+$/i;

/** 경로가 허용 모양 밖일 때 돌려주는 실패. BE의 잘못된 파라미터 400과 같은 code다. */
const INVALID_PATH: PredictionActionResult<never> = {
  ok: false,
  status: 400,
  code: "COMMON_INVALID_PARAM",
  message: "잘못된 요청이에요.",
};

/**
 * 12개 액션이 공유하는 호출부. 경로 모양을 먼저 보고, 쿠키에서 토큰을 꺼내 Bearer로
 * 싣고, BE 응답을 `convert`로 접어 성공 값으로, 실패는 code·message 값으로 돌려준다.
 *
 * @param path BE 경로
 * @param init 메서드와 body
 * @param convert BE 응답 → 도메인. 응답이 없는 204는 null을 돌려주는 함수를 넘긴다
 * @param failureMessage 네트워크 순단일 때 화면에 띄울 문구
 */
async function callProtected<R, T>(
  path: string,
  init: { method: "PUT" | "POST" | "PATCH" | "DELETE"; body?: unknown },
  convert: (response: R) => T,
  failureMessage: string,
): Promise<PredictionActionResult<T>> {
  if (!SAFE_PATH.test(path)) return INVALID_PATH;

  const jar = await cookies();
  const accessToken = jar.get(AUTH_COOKIES.access)?.value;
  if (!accessToken) return AUTH_REQUIRED;

  try {
    const response = await apiFetch<R>(path, {
      method: init.method,
      headers: { Authorization: `Bearer ${accessToken}` },
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    });
    return { ok: true, data: convert(response) };
  } catch (e) {
    if (e instanceof ApiError) {
      return { ok: false, status: e.status, code: e.code, message: e.message };
    }
    console.error(`[predictions] ${init.method} ${path} 실패:`, e);
    return { ok: false, status: 0, code: "NETWORK", message: failureMessage };
  }
}

/** 204 응답을 null로 접는다. */
const toNull = () => null;

/**
 * 예측을 등록하거나 수정한다 (`PUT /matches/{matchId}/prediction`).
 *
 * 처음이면 등록, 이미 있으면 픽과 의견을 바꾼다. 의견이 바뀌면 BE가 `isEdited`를
 * 세운다. 취소했던 예측을 다시 등록하면 기존 행을 되살린다.
 *
 * @param matchId 경기 id
 * @param pick 승무패
 * @param opinion 의견. 앞뒤 공백을 뺀 뒤 5자 이상 300자 이하. 클라가 먼저 걸고 BE가 최종 검증한다
 * @returns 성공이면 `revealed: true`가 된 요약(분포·참여 수 공개). 실패면 BE 에러 code·message.
 *   픽이 아니면 400 `PREDICTION_INVALID_PICK`, 길이는 400 `PREDICTION_OPINION_LENGTH`,
 *   금칙어는 400 `PREDICTION_OPINION_BLOCKED`, 게스트는 403 `AUTH_GUEST_FORBIDDEN`,
 *   UPCOMING은 409 `PREDICTION_NOT_OPEN`, 킥오프가 지났으면 409 `PREDICTION_CLOSED`
 */
export async function upsertPrediction(
  matchId: number,
  pick: PredictionPick,
  opinion: string,
): Promise<PredictionActionResult<PredictionSummary>> {
  return callProtected<PredictionSummaryResponse, PredictionSummary>(
    `/api/v1/matches/${matchId}/prediction`,
    { method: "PUT", body: { pick, opinion } },
    toPredictionSummary,
    "예측을 등록하지 못했어요. 잠시 후 다시 시도해 주세요.",
  );
}

/**
 * 예측을 취소한다 (`DELETE /matches/{matchId}/prediction`, OPEN에서만).
 *
 * 소프트 삭제다. 이후 요약은 `revealed: false`로 돌아가 분포와 의견이 다시 잠긴다.
 *
 * @param matchId 경기 id
 * @returns 성공이면 null(204). 마감 뒤는 409 `PREDICTION_CLOSED`
 */
export async function cancelPrediction(
  matchId: number,
): Promise<PredictionActionResult<null>> {
  return callProtected<null, null>(
    `/api/v1/matches/${matchId}/prediction`,
    { method: "DELETE" },
    toNull,
    "예측을 취소하지 못했어요. 잠시 후 다시 시도해 주세요.",
  );
}

/** 공감 토글 공통. 의견과 답글이 경로만 다르고 응답(`{ likeCount, likedByMe }`)이 같다. */
async function toggleLike(
  path: string,
  liked: boolean,
): Promise<PredictionActionResult<PredictionLikeState>> {
  return callProtected<
    { likeCount: number; likedByMe: boolean },
    PredictionLikeState
  >(
    path,
    { method: liked ? "POST" : "DELETE" },
    (r) => ({ likeCount: r.likeCount, liked: r.likedByMe }),
    "공감을 반영하지 못했어요. 잠시 후 다시 시도해 주세요.",
  );
}

/**
 * 의견에 공감하거나 공감을 거둔다 (`POST`·`DELETE /predictions/{predictionId}/like`).
 * 게스트도 된다.
 *
 * @param predictionId 의견 id
 * @param liked true면 공감, false면 취소
 * @returns 성공이면 BE가 계산한 최신 공감 수와 내 상태. OPEN에서 예측하지 않은
 *   사용자는 403 `PREDICTION_LOCKED`, 없는 의견은 404 `PREDICTION_NOT_FOUND`
 */
export async function likePredictionOpinion(
  predictionId: number,
  liked: boolean,
): Promise<PredictionActionResult<PredictionLikeState>> {
  return toggleLike(`/api/v1/predictions/${predictionId}/like`, liked);
}

/**
 * 답글에 공감하거나 공감을 거둔다 (`POST`·`DELETE /prediction-replies/{replyId}/like`).
 * 규약은 {@link likePredictionOpinion}과 같다.
 *
 * @param replyId 답글 id
 * @param liked true면 공감, false면 취소
 */
export async function likePredictionReply(
  replyId: number,
  liked: boolean,
): Promise<PredictionActionResult<PredictionLikeState>> {
  return toggleLike(`/api/v1/prediction-replies/${replyId}/like`, liked);
}

/**
 * 의견을 신고한다 (`POST /predictions/{predictionId}/report`). 접수만 하고 처리는
 * 어드민 몫이라 성공해도 화면은 안내만 띄운다.
 *
 * @param predictionId 의견 id
 * @param reason 사유. 댓글 신고와 같은 BE enum
 * @returns 성공이면 null. 같은 글 중복은 409 `REPORT_DUPLICATED`, 내 글은 400
 *   `PREDICTION_SELF_REPORT`, 게스트는 403 `AUTH_GUEST_FORBIDDEN`
 */
export async function reportPredictionOpinion(
  predictionId: number,
  reason: PredictionReportReason,
): Promise<PredictionActionResult<null>> {
  return callProtected<null, null>(
    `/api/v1/predictions/${predictionId}/report`,
    { method: "POST", body: { reason } },
    toNull,
    "신고를 접수하지 못했어요. 잠시 후 다시 시도해 주세요.",
  );
}

/**
 * 답글을 신고한다 (`POST /prediction-replies/{replyId}/report`). 규약은
 * {@link reportPredictionOpinion}과 같다.
 *
 * @param replyId 답글 id
 * @param reason 사유
 */
export async function reportPredictionReply(
  replyId: number,
  reason: PredictionReportReason,
): Promise<PredictionActionResult<null>> {
  return callProtected<null, null>(
    `/api/v1/prediction-replies/${replyId}/report`,
    { method: "POST", body: { reason } },
    toNull,
    "신고를 접수하지 못했어요. 잠시 후 다시 시도해 주세요.",
  );
}

/**
 * 답글을 단다 (`POST /predictions/{predictionId}/replies`, 201).
 *
 * 1단계만 있다. 답장은 본문 앞에 `@닉네임 `을 붙여 보낸다. LOCKED, SETTLED, VOID에서도
 * 달 수 있다.
 *
 * @param predictionId 의견 id
 * @param content 본문. 1자 이상 300자 이하, 금칙어·레이트리밋은 댓글과 같다
 * @returns 성공이면 만들어진 답글 한 건. OPEN에서 예측하지 않은 사용자는 403
 *   `PREDICTION_LOCKED`, 길이는 400 `PREDICTION_REPLY_LENGTH`, 금칙어는 400
 *   `PREDICTION_REPLY_BLOCKED`
 */
export async function createPredictionReply(
  predictionId: number,
  content: string,
): Promise<PredictionActionResult<PredictionReply>> {
  return callProtected<PredictionReplyResponse, PredictionReply>(
    `/api/v1/predictions/${predictionId}/replies`,
    { method: "POST", body: { content } },
    toPredictionReply,
    "답글을 등록하지 못했어요. 잠시 후 다시 시도해 주세요.",
  );
}

/**
 * 내 답글을 고친다 (`PATCH /prediction-replies/{replyId}`).
 *
 * @param replyId 답글 id
 * @param content 바꿀 본문
 * @returns 성공이면 `isEdited: true`인 답글. 남의 답글은 403 `PREDICTION_REPLY_FORBIDDEN`,
 *   없는 답글은 404 `PREDICTION_REPLY_NOT_FOUND`
 */
export async function updatePredictionReply(
  replyId: number,
  content: string,
): Promise<PredictionActionResult<PredictionReply>> {
  return callProtected<PredictionReplyResponse, PredictionReply>(
    `/api/v1/prediction-replies/${replyId}`,
    { method: "PATCH", body: { content } },
    toPredictionReply,
    "답글을 수정하지 못했어요. 잠시 후 다시 시도해 주세요.",
  );
}

/**
 * 내 답글을 지운다 (`DELETE /prediction-replies/{replyId}`, 204).
 *
 * @param replyId 답글 id
 * @returns 성공이면 null. 실패 규약은 {@link updatePredictionReply}와 같다
 */
export async function deletePredictionReply(
  replyId: number,
): Promise<PredictionActionResult<null>> {
  return callProtected<null, null>(
    `/api/v1/prediction-replies/${replyId}`,
    { method: "DELETE" },
    toNull,
    "답글을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.",
  );
}

/**
 * 키플레이어에 투표한다 (`PUT /matches/{matchId}/key-players/vote`). 팀별 1표 UPSERT라
 * 다시 부르면 바꾼다. 마감은 킥오프. 게스트도 된다.
 *
 * @param matchId 경기 id
 * @param side 홈인지 원정인지
 * @param playerId 후보 목록(`candidates`)의 선수 id
 * @returns 성공이면 득표가 반영된 키플레이어 전체(GET과 같은 모양). 스쿼드 밖 선수는
 *   400 `KEY_PLAYER_NOT_IN_SQUAD`, 마감 뒤는 409 `PREDICTION_CLOSED`
 */
export async function voteKeyPlayer(
  matchId: number,
  side: KeyPlayerSide,
  playerId: number,
): Promise<PredictionActionResult<KeyPlayers>> {
  return callProtected<KeyPlayersResponse, KeyPlayers>(
    `/api/v1/matches/${matchId}/key-players/vote`,
    { method: "PUT", body: { side, playerId } },
    toKeyPlayers,
    "투표를 반영하지 못했어요. 잠시 후 다시 시도해 주세요.",
  );
}

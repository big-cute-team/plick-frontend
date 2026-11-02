/**
 * @file 승부예측 오류 분류 (KAN-695). BE 에러 code를 화면이 할 일(종류)과 문구로 바꾼다.
 *
 * 쓰기 12종과 잠긴 읽기(의견 하나, 답글)가 같은 code 묶음을 돌려주는데, 호출부마다
 * `code` 문자열을 늘어놓으면 분기가 조용히 어긋난다. 그래서 code → 종류 표를 한 곳에
 * 두고 훅은 종류만 본다. 종류별로 화면이 할 일은 아래와 같다(시안 가이드 §5.5, 티켓 완료 조건).
 *
 * | 종류 | code | 화면 |
 * | --- | --- | --- |
 * | login | 401 `AUTH_REQUIRED` | 로그인 시트·팝업. 로그인 뒤 같은 픽으로 작성 재개 |
 * | link-account | 403 `AUTH_GUEST_FORBIDDEN` | 로그인이 아니라 "계정 연동 후 예측할 수 있어요" 안내와 연동하기 |
 * | closed | 409 `PREDICTION_CLOSED` | 토스트 "방금 마감됐어요" 뒤 요약 재조회. 시트는 닫는다 |
 * | not-open | 409 `PREDICTION_NOT_OPEN` | 아직 UPCOMING. 요약 재조회로 상태 줄을 맞춘다 |
 * | locked | 403 `PREDICTION_LOCKED` | OPEN에서 예측 전. 공감·답글·의견 상세 대신 작성 유도 |
 * | not-available | 404 `PREDICTION_NOT_AVAILABLE` | 빅6 밖 경기. 예측 탭·묶음을 만들지 않는다 |
 * | not-found | 404 `PREDICTION_NOT_FOUND`, `PREDICTION_REPLY_NOT_FOUND` | 지워진 글. 목록을 다시 받는다 |
 * | blocked-word | 400 `PREDICTION_OPINION_BLOCKED`, `PREDICTION_REPLY_BLOCKED` | 입력란 테두리 + "부적절한 표현이 있어요". 시트를 닫지 않는다 |
 * | length | 400 `PREDICTION_OPINION_LENGTH`, `PREDICTION_REPLY_LENGTH` | 클라 검증이 먼저 막지만 BE 문구를 입력란 아래에 |
 * | invalid-pick | 400 `PREDICTION_INVALID_PICK` | 픽 없이 보낸 것. 클라 검증이 먼저 막는다 |
 * | duplicate-report | 409 `REPORT_DUPLICATED` | "이미 신고한 글이에요" 안내 팝업 |
 * | self-report | 400 `PREDICTION_SELF_REPORT` | 내 글. 화면이 신고 버튼을 안 그리지만 받으면 안내 |
 * | forbidden | 403 `PREDICTION_REPLY_FORBIDDEN` | 남의 답글 수정·삭제. 목록을 다시 받는다 |
 * | not-in-squad | 400 `KEY_PLAYER_NOT_IN_SQUAD` | 후보 목록을 다시 받는다 |
 * | busy | 503 `COMMON_SERVICE_BUSY` | 1초 뒤 한 번 재시도(`SERVICE_BUSY_RETRY_DELAY_MS`) |
 * | network | status 0 | 되돌리고 "잠시 후 다시 시도해 주세요" |
 * | unknown | 그 밖 | BE 문구 그대로 토스트 |
 */

import { ApiError, isServiceBusy, needsSocialAccount } from "./client";

/** 승부예측이 쓰는 BE 에러 code. 문자열 리터럴이 흩어지지 않게 한 곳에 둔다. */
export const PREDICTION_ERROR_CODE = {
  notAvailable: "PREDICTION_NOT_AVAILABLE",
  notFound: "PREDICTION_NOT_FOUND",
  invalidPick: "PREDICTION_INVALID_PICK",
  opinionLength: "PREDICTION_OPINION_LENGTH",
  opinionBlocked: "PREDICTION_OPINION_BLOCKED",
  notOpen: "PREDICTION_NOT_OPEN",
  closed: "PREDICTION_CLOSED",
  locked: "PREDICTION_LOCKED",
  selfReport: "PREDICTION_SELF_REPORT",
  replyNotFound: "PREDICTION_REPLY_NOT_FOUND",
  replyForbidden: "PREDICTION_REPLY_FORBIDDEN",
  replyLength: "PREDICTION_REPLY_LENGTH",
  replyBlocked: "PREDICTION_REPLY_BLOCKED",
  reportDuplicated: "REPORT_DUPLICATED",
  keyPlayerNotInSquad: "KEY_PLAYER_NOT_IN_SQUAD",
  authRequired: "AUTH_REQUIRED",
  guestForbidden: "AUTH_GUEST_FORBIDDEN",
} as const;

/** 화면이 분기하는 실패 종류. 파일 머리의 표가 종류별 처리다. */
export type PredictionFailureKind =
  | "login"
  | "link-account"
  | "closed"
  | "not-open"
  | "locked"
  | "not-available"
  | "not-found"
  | "blocked-word"
  | "length"
  | "invalid-pick"
  | "duplicate-report"
  | "self-report"
  | "forbidden"
  | "not-in-squad"
  | "busy"
  | "network"
  | "unknown";

/** 분류된 실패. `message`는 화면에 그대로 띄울 수 있는 문구다. */
export interface PredictionFailure {
  kind: PredictionFailureKind;
  /** BE 에러 code. 네트워크 실패는 `NETWORK`, ApiError가 아니면 `UNKNOWN` */
  code: string;
  status: number;
  message: string;
}

/** code → 종류. 표에 없는 code는 unknown이다. */
const KIND_BY_CODE: Record<string, PredictionFailureKind> = {
  [PREDICTION_ERROR_CODE.authRequired]: "login",
  [PREDICTION_ERROR_CODE.guestForbidden]: "link-account",
  [PREDICTION_ERROR_CODE.closed]: "closed",
  [PREDICTION_ERROR_CODE.notOpen]: "not-open",
  [PREDICTION_ERROR_CODE.locked]: "locked",
  [PREDICTION_ERROR_CODE.notAvailable]: "not-available",
  [PREDICTION_ERROR_CODE.notFound]: "not-found",
  [PREDICTION_ERROR_CODE.replyNotFound]: "not-found",
  [PREDICTION_ERROR_CODE.opinionBlocked]: "blocked-word",
  [PREDICTION_ERROR_CODE.replyBlocked]: "blocked-word",
  [PREDICTION_ERROR_CODE.opinionLength]: "length",
  [PREDICTION_ERROR_CODE.replyLength]: "length",
  [PREDICTION_ERROR_CODE.invalidPick]: "invalid-pick",
  [PREDICTION_ERROR_CODE.reportDuplicated]: "duplicate-report",
  [PREDICTION_ERROR_CODE.selfReport]: "self-report",
  [PREDICTION_ERROR_CODE.replyForbidden]: "forbidden",
  [PREDICTION_ERROR_CODE.keyPlayerNotInSquad]: "not-in-squad",
};

/**
 * 종류별 화면 문구(시안 가이드 §7 카피). 가이드에 없는 종류는 BE 문구를 쓰므로 여기 없다.
 * 설명체와 가운뎃점을 쓰지 않는 카피 규칙을 따른다.
 */
export const PREDICTION_FAILURE_COPY: Partial<
  Record<PredictionFailureKind, string>
> = {
  login: "로그인이 필요해요",
  "link-account": "계정 연동 후 예측할 수 있어요",
  closed: "방금 마감됐어요",
  "not-open": "아직 예측이 열리지 않았어요",
  locked: "의견을 남기고 다른 사람들의 의견을 확인해 보세요",
  "not-available": "예측할 수 없는 경기예요",
  "not-found": "지워진 글이에요",
  "blocked-word": "부적절한 표현이 있어요",
  "duplicate-report": "이미 신고한 글이에요",
  "self-report": "내 글은 신고할 수 없어요",
  busy: "잠시 후 다시 시도해 주세요",
  network: "연결이 불안정해요. 잠시 후 다시 시도해 주세요",
};

/**
 * 승부예측 호출의 실패를 화면이 분기할 종류로 바꾼다.
 *
 * 로그인·연동 판정은 `needsSocialAccount`와 같은 기준(code)으로 하되 둘을 가른다.
 * 댓글은 둘 다 같은 팝업이라 묶었지만, 예측은 게스트에게 로그인 시트를 띄우면 안 되고
 * "계정 연동" 안내로 가야 한다(티켓 완료 조건). 503 바쁨은 `isServiceBusy`를 그대로 쓴다.
 *
 * @param error 뮤테이션이나 fetcher가 던진 값. `ApiError`가 아니면 네트워크 순단으로 본다
 * @returns 종류, code, status, 화면 문구
 * @example
 * const failure = classifyPredictionError(error);
 * if (failure.kind === "login") openLoginSheet();
 */
export function classifyPredictionError(error: unknown): PredictionFailure {
  if (!(error instanceof ApiError)) {
    return {
      kind: "network",
      code: "NETWORK",
      status: 0,
      message: PREDICTION_FAILURE_COPY.network ?? "",
    };
  }

  let kind: PredictionFailureKind;
  if (needsSocialAccount(error)) {
    kind =
      error.code === PREDICTION_ERROR_CODE.guestForbidden
        ? "link-account"
        : "login";
  } else if (isServiceBusy(error)) {
    kind = "busy";
  } else {
    kind = KIND_BY_CODE[error.code] ?? "unknown";
  }

  return {
    kind,
    code: error.code,
    status: error.status,
    message: PREDICTION_FAILURE_COPY[kind] ?? error.message,
  };
}

/**
 * 이 실패 뒤에 요약을 다시 받아야 하는가. 마감·미개장은 화면이 들고 있던 상태가 서버와
 * 어긋난 것이라 상태 줄과 바를 서버 값으로 맞춘다(가이드 §5.5 "409면 토스트 후 요약 재조회").
 *
 * @param kind 분류된 종류
 */
export function refetchesSummaryAfter(kind: PredictionFailureKind): boolean {
  return kind === "closed" || kind === "not-open";
}

/**
 * 작성 시트를 닫지 않고 입력란에 표시할 실패인가. 금칙어와 길이는 고쳐서 다시 보낼 수
 * 있는 입력 문제라 시트를 유지한다.
 *
 * @param kind 분류된 종류
 */
export function keepsComposerOpen(kind: PredictionFailureKind): boolean {
  return (
    kind === "blocked-word" || kind === "length" || kind === "invalid-pick"
  );
}

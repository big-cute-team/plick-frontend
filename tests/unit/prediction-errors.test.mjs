/**
 * @file 승부예측 오류 분류 테스트 (KAN-695). 게스트 403이 로그인이 아니라 계정 연동으로
 * 갈리는지, 시안 가이드의 문구가 붙는지, 마감 뒤 요약 재조회와 작성 시트 유지 판정을 본다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ApiError } from "../../packages/core/src/client.ts";
import {
  classifyPredictionError,
  keepsComposerOpen,
  refetchesSummaryAfter,
} from "../../packages/core/src/prediction-errors.ts";

const api = (status, code, message = "BE 문구") =>
  new ApiError(status, code, message);

test("401은 로그인, 게스트 403은 계정 연동으로 가른다", () => {
  assert.equal(
    classifyPredictionError(api(401, "AUTH_REQUIRED")).kind,
    "login",
  );
  const guest = classifyPredictionError(api(403, "AUTH_GUEST_FORBIDDEN"));
  assert.equal(guest.kind, "link-account");
  assert.equal(guest.message, "계정 연동 후 예측할 수 있어요");
});

test("가이드가 정한 문구가 BE 문구를 덮고, 없는 종류는 BE 문구를 쓴다", () => {
  const closed = classifyPredictionError(api(409, "PREDICTION_CLOSED"));
  assert.deepEqual(closed, {
    kind: "closed",
    code: "PREDICTION_CLOSED",
    status: 409,
    message: "방금 마감됐어요",
  });
  assert.equal(
    classifyPredictionError(api(400, "PREDICTION_OPINION_BLOCKED")).message,
    "부적절한 표현이 있어요",
  );
  const length = classifyPredictionError(
    api(
      400,
      "PREDICTION_OPINION_LENGTH",
      "의견은 5자 이상 300자 이하로 적어 주세요.",
    ),
  );
  assert.equal(length.kind, "length");
  assert.equal(length.message, "의견은 5자 이상 300자 이하로 적어 주세요.");
});

test("공통 처리 다섯 code가 각자 종류로 간다", () => {
  const kinds = {
    PREDICTION_NOT_OPEN: "not-open",
    PREDICTION_LOCKED: "locked",
    PREDICTION_NOT_AVAILABLE: "not-available",
    REPORT_DUPLICATED: "duplicate-report",
    PREDICTION_REPLY_BLOCKED: "blocked-word",
    PREDICTION_REPLY_NOT_FOUND: "not-found",
    KEY_PLAYER_NOT_IN_SQUAD: "not-in-squad",
    COMMON_SERVICE_BUSY: "busy",
  };
  for (const [code, kind] of Object.entries(kinds)) {
    assert.equal(classifyPredictionError(api(400, code)).kind, kind, code);
  }
  assert.equal(
    classifyPredictionError(api(500, "COMMON_ERROR")).kind,
    "unknown",
  );
});

test("ApiError가 아니면 네트워크 순단으로 본다", () => {
  const failure = classifyPredictionError(new TypeError("fetch failed"));
  assert.equal(failure.kind, "network");
  assert.equal(failure.status, 0);
  assert.equal(failure.code, "NETWORK");
});

test("마감·미개장 뒤에는 요약을 다시 받고, 입력 문제는 시트를 유지한다", () => {
  assert.equal(refetchesSummaryAfter("closed"), true);
  assert.equal(refetchesSummaryAfter("not-open"), true);
  assert.equal(refetchesSummaryAfter("blocked-word"), false);
  assert.equal(keepsComposerOpen("blocked-word"), true);
  assert.equal(keepsComposerOpen("length"), true);
  assert.equal(keepsComposerOpen("closed"), false);
});

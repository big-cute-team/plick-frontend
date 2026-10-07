/**
 * @file 기기 헤더 게이트와 봇 표시 회귀 테스트 (KAN-607). 위장 크롤러가 페이지마다 새 기기로
 * 세어지는 구멍과, E2E·크롤러 이벤트가 사람으로 남는 구멍이 조용히 다시 열리지 않게 한다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ANALYTICS_HEADERS,
  ANALYTICS_HEADER_NAMES,
  BOT_HEADER_VALUE,
  E2E_COOKIE,
  isBotRequest,
  resolveDeviceId,
} from "../../packages/core/src/analytics.ts";

const DID = "6f9619ff-8b86-4d11-b42d-00c04fc964ff";
const FRESH = "11111111-2222-4333-8444-555555555555";
const generate = () => FRESH;

/** 프록시가 넘기는 모양. 안 넘긴 칸은 "없음"이다 */
const req = (over) => ({
  cookie: undefined,
  handed: null,
  isProxy: false,
  isCrawler: false,
  ...over,
});

test("쿠키를 들고 온 요청만 기기 헤더를 싣는다", () => {
  assert.deepEqual(resolveDeviceId(req({ cookie: DID }), generate), {
    id: DID,
    send: true,
    issue: false,
  });
  /* `/be` fetch도 쿠키가 있으면 싣는다. 사람의 app_entered가 이 길로 온다 */
  assert.deepEqual(
    resolveDeviceId(req({ cookie: DID, isProxy: true }), generate),
    { id: DID, send: true, issue: false },
  );
});

test("쿠키 없는 첫 페이지 요청은 새 값을 쿠키에만 심고 헤더에는 안 싣는다", () => {
  assert.deepEqual(resolveDeviceId(req(), generate), {
    id: FRESH,
    send: false,
    issue: true,
  });
  /* 형식 밖 쿠키는 없는 것으로 보고 새로 만든다. 그것도 첫 요청이다 */
  assert.deepEqual(resolveDeviceId(req({ cookie: "garbage" }), generate), {
    id: FRESH,
    send: false,
    issue: true,
  });
});

test("전환 배너가 넘긴 값도 쿠키에만 심는다", () => {
  assert.deepEqual(
    resolveDeviceId(req({ handed: DID.toUpperCase() }), generate),
    { id: DID, send: false, issue: true },
  );
  /* 쿠키가 있으면 남이 보낸 링크의 값이 덮어쓰지 못한다 */
  assert.deepEqual(
    resolveDeviceId(req({ cookie: DID, handed: FRESH }), generate),
    { id: DID, send: true, issue: false },
  );
  /* 형식 밖 값은 무시하고 새로 만든다 */
  assert.deepEqual(resolveDeviceId(req({ handed: "nope" }), generate), {
    id: FRESH,
    send: false,
    issue: true,
  });
});

test("쿠키 없는 /be fetch와 크롤러에게는 기기를 만들지 않는다", () => {
  const none = { id: null, send: false, issue: false };
  assert.deepEqual(resolveDeviceId(req({ isProxy: true }), generate), none);
  /* `/be` fetch는 배너 쿼리도 안 본다 */
  assert.deepEqual(
    resolveDeviceId(req({ isProxy: true, handed: DID }), generate),
    none,
  );
  assert.deepEqual(resolveDeviceId(req({ isCrawler: true }), generate), none);
  /* 크롤러라도 배너 값은 받는다. 쿠키를 들고 다시 오면 그때 실린다 */
  assert.deepEqual(
    resolveDeviceId(req({ isCrawler: true, handed: DID }), generate),
    { id: DID, send: false, issue: true },
  );
});

test("크롤러이거나 E2E 쿠키가 있으면 봇이다", () => {
  assert.equal(isBotRequest({ isCrawler: true, hasE2eCookie: false }), true);
  assert.equal(isBotRequest({ isCrawler: false, hasE2eCookie: true }), true);
  assert.equal(isBotRequest({ isCrawler: true, hasE2eCookie: true }), true);
  assert.equal(isBotRequest({ isCrawler: false, hasE2eCookie: false }), false);
});

test("봇 헤더 계약은 BE KAN-606과 E2E 설정에 못 박힌 값이다", () => {
  assert.equal(ANALYTICS_HEADERS.bot, "X-Plick-Bot");
  assert.equal(BOT_HEADER_VALUE, "1");
  assert.equal(E2E_COOKIE, "plick_e2e");
  /* 서버 측 apiFetch의 헤더 제공자가 이 목록으로 옮겨 싣는다. 빠지면 서버 렌더링 이벤트가 사람으로 남는다 */
  assert.ok(ANALYTICS_HEADER_NAMES.includes("X-Plick-Bot"));
});

test("Playwright가 심는 쿠키 이름이 프록시가 읽는 이름과 같다", () => {
  /* @plick/e2e는 @plick/core를 의존하지 않아 리터럴로 적는다. 한쪽만 바뀌면 E2E가 다시 사람으로 세어진다 */
  const config = readFileSync(
    new URL("../e2e/playwright.config.ts", import.meta.url),
    "utf8",
  );
  assert.ok(config.includes(`name: "${E2E_COOKIE}"`));
});

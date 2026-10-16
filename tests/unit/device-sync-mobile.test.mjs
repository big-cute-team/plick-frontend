/**
 * @file 모바일 `<head>` 스크립트의 KAN-665 갈래 회귀 테스트. 프록시가 페이지 응답에 심던 기기 식별자와
 * 유입 정보를 브라우저로 옮긴 부분(`deviceSyncScript({ issue, landing })`)과 랜딩 쿠키 풀기를 고정한다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {
  DEVICE_ID_COOKIE,
  DEVICE_ID_STORAGE_KEY,
  LANDING_COOKIE,
  deviceSyncScript,
  parseLandingCookie,
} from "../../packages/core/src/analytics.ts";

const OLD = "6f9619ff-8b86-4d11-b42d-00c04fc964ff";
const FRESH = "11111111-2222-4333-8444-555555555555";
const HANDED = "AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE";
const CRAWLER = /bot|curl/i;
const SAFARI = "Mozilla/5.0 (iPhone) Safari/604.1";

function storage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    map,
  };
}

/** 모바일 옵션으로 스크립트를 한 번 돌린다 */
function run({
  cookie,
  local = {},
  search = "",
  referrer = "",
  userAgent = SAFARI,
  randomUUID = () => FRESH,
} = {}) {
  const writes = [];
  const env = {
    document: {
      get cookie() {
        return cookie ? `${DEVICE_ID_COOKIE}=${cookie}` : "";
      },
      set cookie(v) {
        writes.push(v);
      },
      referrer,
    },
    localStorage: storage(local),
    sessionStorage: storage(),
    location: { protocol: "https:", host: "m.plick.co.kr", search },
    navigator: { userAgent },
    crypto: { randomUUID },
    URL,
    URLSearchParams,
  };
  vm.runInNewContext(
    deviceSyncScript({
      issue: { crawlerPattern: CRAWLER, handedParam: "did" },
      landing: true,
    }),
    env,
  );
  return { ...env, writes };
}

const deviceWrites = (env) =>
  env.writes.filter((w) => w.startsWith(`${DEVICE_ID_COOKIE}=`));
const landingWrites = (env) =>
  env.writes.filter((w) => w.startsWith(`${LANDING_COOKIE}=`));

test("쿠키도 localStorage도 없으면 새 식별자를 만들어 둘 다 적는다", () => {
  const env = run();
  assert.equal(deviceWrites(env).length, 1);
  assert.ok(deviceWrites(env)[0].startsWith(`${DEVICE_ID_COOKIE}=${FRESH}; `));
  assert.equal(env.localStorage.getItem(DEVICE_ID_STORAGE_KEY), FRESH);
});

test("전환 배너가 넘긴 ?did=가 있으면 그 값을 소문자로 쓴다", () => {
  const env = run({ search: `?did=${HANDED}` });
  assert.ok(
    deviceWrites(env)[0].startsWith(
      `${DEVICE_ID_COOKIE}=${HANDED.toLowerCase()}; `,
    ),
  );
});

test("이미 식별자가 있으면 넘긴 값이나 새 값으로 덮지 않는다", () => {
  const env = run({
    cookie: OLD,
    local: { [DEVICE_ID_STORAGE_KEY]: OLD },
    search: `?did=${HANDED}`,
  });
  assert.equal(deviceWrites(env).length, 0);
});

test("크롤러 UA면 식별자를 만들지 않는다", () => {
  const env = run({ userAgent: "Googlebot/2.1" });
  assert.equal(deviceWrites(env).length, 0);
  assert.equal(env.localStorage.map.size, 0);
});

test("주소에 쿼리가 있으면 랜딩 쿠키에 쿼리를 적는다. 내부 Referer는 비운다", () => {
  const env = run({
    cookie: OLD,
    local: { [DEVICE_ID_STORAGE_KEY]: OLD },
    search: "?utm_source=insta&fbclid=Ab1",
    referrer: "https://m.plick.co.kr/faq",
  });
  const [write] = landingWrites(env);
  const value = decodeURIComponent(write.split(";")[0].split("=")[1]);
  assert.equal(value, "?utm_source=insta&fbclid=Ab1\n");
});

test("외부에서 들어왔으면 쿼리가 없어도 Referer origin을 적는다", () => {
  const env = run({
    cookie: OLD,
    local: { [DEVICE_ID_STORAGE_KEY]: OLD },
    referrer: "https://l.instagram.com/?u=https%3A%2F%2Fm.plick.co.kr",
  });
  const value = decodeURIComponent(
    landingWrites(env)[0].split(";")[0].split("=")[1],
  );
  assert.equal(value, "\nhttps://l.instagram.com");
});

test("쿼리도 외부 Referer도 없으면 랜딩 쿠키를 안 쓴다", () => {
  const env = run({
    cookie: OLD,
    local: { [DEVICE_ID_STORAGE_KEY]: OLD },
    referrer: "https://m.plick.co.kr/",
  });
  assert.equal(landingWrites(env).length, 0);
});

test("옵션 없는 웹 스크립트는 만들지도 넘기지도 않는다", () => {
  const writes = [];
  vm.runInNewContext(deviceSyncScript(), {
    document: {
      cookie: "",
      set cookie(v) {
        writes.push(v);
      },
      referrer: "https://l.instagram.com/",
    },
    localStorage: storage(),
    sessionStorage: storage(),
    location: { protocol: "https:", host: "plick.co.kr", search: "?a=1" },
  });
  assert.equal(writes.length, 0);
});

test("랜딩 쿠키를 쿼리와 Referer로 푼다", () => {
  const landing = parseLandingCookie("?path=share&utm_source=x\nhttps://t.co");
  assert.equal(landing.searchParams.get("path"), "share");
  assert.equal(landing.referer, "https://t.co");
  assert.equal(parseLandingCookie("?a=1\n").referer, null);
  assert.equal(parseLandingCookie("garbage"), null);
  assert.equal(parseLandingCookie(undefined), null);
});

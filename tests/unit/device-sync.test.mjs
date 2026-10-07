/**
 * @file 기기 식별자 동기화 스크립트 회귀 테스트 (KAN-610). `<head>`에 박히는 문자열을 가짜
 * document·localStorage·sessionStorage로 돌려, 쿠키가 사라졌을 때 localStorage 값으로 되살리고
 * 복원 표식을 남기는지와 그 반대 방향의 거울 쓰기를 고정한다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {
  ANALYTICS_COOKIE_MAX_AGE,
  DEVICE_ID_COOKIE,
  DEVICE_ID_STORAGE_KEY,
  DEVICE_RESTORED_KEY,
  deviceSyncScript,
} from "../../packages/core/src/analytics.ts";

const OLD = "6f9619ff-8b86-4d11-b42d-00c04fc964ff";
const FRESH = "11111111-2222-4333-8444-555555555555";

function storage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    map,
  };
}

/** 스크립트를 한 번 돌리고 가짜 환경을 돌려준다 */
function run({ cookie, local = {}, protocol = "https:" } = {}) {
  const writes = [];
  const document = {
    get cookie() {
      return cookie ? `${DEVICE_ID_COOKIE}=${cookie}; other=1` : "other=1";
    },
    set cookie(v) {
      writes.push(v);
    },
  };
  const env = {
    document,
    localStorage: storage(local),
    sessionStorage: storage(),
    location: { protocol },
  };
  vm.runInNewContext(deviceSyncScript(), env);
  return { ...env, writes };
}

test("쿠키가 새 값인데 localStorage에 옛 값이 있으면 쿠키를 되살리고 표식을 남긴다", () => {
  const env = run({ cookie: FRESH, local: { [DEVICE_ID_STORAGE_KEY]: OLD } });
  assert.equal(env.writes.length, 1);
  assert.equal(
    env.writes[0],
    `${DEVICE_ID_COOKIE}=${OLD}; Max-Age=${ANALYTICS_COOKIE_MAX_AGE}; Path=/; SameSite=Lax; Secure`,
  );
  assert.equal(env.sessionStorage.getItem(DEVICE_RESTORED_KEY), "1");
});

test("쿠키가 아예 없어도 같은 길로 되살린다. http면 Secure를 안 단다", () => {
  const env = run({
    cookie: undefined,
    local: { [DEVICE_ID_STORAGE_KEY]: OLD },
    protocol: "http:",
  });
  assert.equal(env.writes.length, 1);
  assert.ok(env.writes[0].startsWith(`${DEVICE_ID_COOKIE}=${OLD}; `));
  assert.ok(!env.writes[0].includes("Secure"));
  assert.equal(env.sessionStorage.getItem(DEVICE_RESTORED_KEY), "1");
});

test("둘이 같으면 아무것도 안 쓴다", () => {
  const env = run({ cookie: OLD, local: { [DEVICE_ID_STORAGE_KEY]: OLD } });
  assert.equal(env.writes.length, 0);
  assert.equal(env.sessionStorage.getItem(DEVICE_RESTORED_KEY), null);
});

test("localStorage가 비었고 쿠키가 유효하면 localStorage에 거울로 적는다", () => {
  const env = run({ cookie: OLD });
  assert.equal(env.writes.length, 0);
  assert.equal(env.localStorage.getItem(DEVICE_ID_STORAGE_KEY), OLD);
  assert.equal(env.sessionStorage.getItem(DEVICE_RESTORED_KEY), null);
});

test("형식이 깨진 localStorage 값은 못 믿고, 유효한 쿠키로 덮는다", () => {
  const env = run({
    cookie: OLD,
    local: { [DEVICE_ID_STORAGE_KEY]: "garbage" },
  });
  assert.equal(env.writes.length, 0);
  assert.equal(env.localStorage.getItem(DEVICE_ID_STORAGE_KEY), OLD);
});

test("둘 다 없으면 아무것도 안 한다. 프록시가 다음 응답에서 새로 만든다", () => {
  const env = run({});
  assert.equal(env.writes.length, 0);
  assert.equal(env.localStorage.map.size, 0);
});

test("저장소를 못 쓰는 환경에서도 던지지 않는다", () => {
  const document = { cookie: `${DEVICE_ID_COOKIE}=${OLD}` };
  const throwing = {
    getItem() {
      throw new Error("SecurityError");
    },
    setItem() {
      throw new Error("SecurityError");
    },
  };
  assert.doesNotThrow(() =>
    vm.runInNewContext(deviceSyncScript(), {
      document,
      localStorage: throwing,
      sessionStorage: throwing,
      location: { protocol: "https:" },
    }),
  );
});

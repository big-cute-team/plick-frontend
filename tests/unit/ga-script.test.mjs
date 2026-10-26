/**
 * @file `@plick/core/analytics`의 GA4 스크립트 회귀 테스트 (KAN-674). 초기화 큐가 라이브러리 없이도
 * `js`·`config`를 쌓는지, 라이브러리 주소가 측정 ID를 싣는지.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {
  gaInitScript,
  gaScriptUrl,
} from "../../packages/core/src/analytics.ts";

test("초기화 스크립트는 dataLayer에 js와 config를 쌓는다", () => {
  const window = {};
  window.window = window;
  vm.runInNewContext(gaInitScript("G-TEST123"), window);
  const queued = window.dataLayer.map((args) => Array.from(args));
  assert.equal(queued.length, 2);
  assert.equal(queued[0][0], "js");
  assert.equal(Object.prototype.toString.call(queued[0][1]), "[object Date]");
  assert.deepEqual(queued[1], ["config", "G-TEST123"]);
});

test("이미 있는 dataLayer는 지우지 않고 뒤에 붙인다", () => {
  const window = { dataLayer: [["earlier"]] };
  window.window = window;
  vm.runInNewContext(gaInitScript("G-TEST123"), window);
  assert.equal(window.dataLayer.length, 3);
  assert.deepEqual(window.dataLayer[0], ["earlier"]);
});

test("측정 ID는 따옴표를 깨지 못한다", () => {
  const window = {};
  window.window = window;
  vm.runInNewContext(gaInitScript("G-1');alert(1);//"), window);
  assert.deepEqual(Array.from(window.dataLayer[1]), [
    "config",
    "G-1');alert(1);//",
  ]);
});

test("라이브러리 주소는 측정 ID를 쿼리로 싣는다", () => {
  assert.equal(
    gaScriptUrl("G-BF3JX9EDYQ"),
    "https://www.googletagmanager.com/gtag/js?id=G-BF3JX9EDYQ",
  );
});

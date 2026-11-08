/**
 * @file 서비스 버전 정합성 테스트 (KAN-741). 단일 출처인 APP_VERSION과 package.json,
 * CHANGELOG 맨 위 항목이 어긋나면 실패한다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  APP_VERSION,
  BRAND_NAME_KO,
  appVersionLabel,
} from "../../packages/domain/src/brand.ts";

const fromRoot = (path) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("APP_VERSION은 X.Y.Z 형식이다", () => {
  assert.match(APP_VERSION, /^\d+\.\d+\.\d+$/);
});

test("화면 라벨은 브랜드명과 APP_VERSION을 잇는다", () => {
  assert.equal(appVersionLabel(), `${BRAND_NAME_KO} v${APP_VERSION}`);
});

for (const path of [
  "package.json",
  "apps/web/package.json",
  "apps/mobile/package.json",
]) {
  test(`${path}의 version은 APP_VERSION과 같다`, () => {
    assert.equal(JSON.parse(fromRoot(path)).version, APP_VERSION);
  });
}

test("CHANGELOG 맨 위 항목은 APP_VERSION이다", () => {
  const latest = fromRoot("CHANGELOG.md").match(/^## (\d+\.\d+\.\d+) /m);
  assert.equal(latest?.[1], APP_VERSION);
});

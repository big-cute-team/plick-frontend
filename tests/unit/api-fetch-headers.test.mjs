/**
 * @file `@plick/core/fetch-cache` 회귀 테스트 (KAN-632). 서버 `apiFetch`가 분석 헤더 제공자를
 * 건너뛰는 호출(공유 캐시를 타는 익명 GET)과 기본 캐시 수명을 붙이는 호출을 표로 고정한다.
 * 이 판정이 `revalidate`를 직접 준 호출을 빠뜨려 ISR 재생성 때 터진 적이 있다(ADR 0199).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sharesDataCache,
  usesDefaultCache,
} from "../../packages/core/src/fetch-cache.ts";

const cases = [
  ["익명 GET, 옵션 없음", undefined, false, { shared: true, def: true }],
  [
    "익명 GET, revalidate 20",
    { next: { revalidate: 20 } },
    false,
    { shared: true, def: false },
  ],
  [
    "익명 GET, revalidate false",
    { next: { revalidate: false } },
    false,
    { shared: true, def: false },
  ],
  [
    "익명 GET, no-store",
    { cache: "no-store" },
    false,
    { shared: false, def: false },
  ],
  [
    "익명 GET, revalidate 0",
    { next: { revalidate: 0 } },
    false,
    { shared: false, def: false },
  ],
  ["토큰 실은 GET", undefined, true, { shared: false, def: false }],
  ["익명 POST", { method: "POST" }, false, { shared: false, def: false }],
  ["소문자 get", { method: "get" }, false, { shared: true, def: true }],
];

for (const [name, init, authorized, expected] of cases) {
  test(name, () => {
    assert.equal(sharesDataCache(init, authorized), expected.shared, "shared");
    assert.equal(
      usesDefaultCache(init, authorized),
      expected.def,
      "default cache",
    );
  });
}

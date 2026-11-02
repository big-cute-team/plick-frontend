/**
 * @file 투표 화면 탭 ↔ URL 변환 테스트 (KAN-701). 랭킹 탭이 더해지면서 두 앱의 `debateTabFrom`이 `rank`를
 * 받고 `debateTabPath`가 `/debates?tab=rank`를 돌려주는지 본다. 이 변환이 깨지면 홈, 예측 탭, MY의 랭킹
 * 진입 링크가 전부 기본 탭으로 떨어진다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as web from "../../apps/web/app/_utils/debates.ts";
import * as mobile from "../../apps/mobile/app/_utils/debates.ts";

for (const [name, utils] of [
  ["web", web],
  ["mobile", mobile],
]) {
  test(`${name}: ?tab= 값은 closed와 rank만 받고 나머지는 진행 중`, () => {
    assert.equal(utils.debateTabFrom("rank"), "rank");
    assert.equal(utils.debateTabFrom("closed"), "closed");
    assert.equal(utils.debateTabFrom("open"), "open");
    assert.equal(utils.debateTabFrom(null), "open");
    assert.equal(utils.debateTabFrom(undefined), "open");
    assert.equal(utils.debateTabFrom("pred"), "open");
  });

  test(`${name}: 탭 → URL은 기본 탭만 쿼리가 없다`, () => {
    assert.equal(utils.debateTabPath("open"), "/debates");
    assert.equal(utils.debateTabPath("closed"), "/debates?tab=closed");
    assert.equal(utils.debateTabPath("rank"), "/debates?tab=rank");
  });
}

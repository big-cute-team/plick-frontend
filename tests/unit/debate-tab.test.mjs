/**
 * @file 투표 화면 탭 ↔ URL 변환 테스트 (KAN-701). 두 앱의 `debateTabFrom`이 `prediction`을 받고
 * `debateTabPath`가 쿼리를 돌려주는지 본다. 랭킹은 모바일만 탭(`rank`)이고 웹은 `/rankings` 페이지로
 * 나가서(KAN-724 PR) 웹의 `rank`는 모르는 값으로 떨어지되 `LEGACY_RANK_TAB`으로 알아본다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as web from "../../apps/web/app/_utils/debates.ts";
import * as mobile from "../../apps/mobile/app/_utils/debates.ts";

for (const [name, utils] of [
  ["web", web],
  ["mobile", mobile],
]) {
  test(`${name}: ?tab= 값은 prediction을 받고 이전 closed 링크는 밸런스게임으로 이동`, () => {
    assert.equal(utils.debateTabFrom("prediction"), "prediction");
    assert.equal(utils.debateTabFrom("closed"), "open");
    assert.equal(utils.debateTabFrom("open"), "open");
    assert.equal(utils.debateTabFrom(null), "open");
    assert.equal(utils.debateTabFrom(undefined), "open");
    assert.equal(utils.debateTabFrom("pred"), "open");
  });

  test(`${name}: 탭 → URL은 기본 탭만 쿼리가 없다`, () => {
    assert.equal(utils.debateTabPath("open"), "/debates");
    assert.equal(utils.debateTabPath("prediction"), "/debates?tab=prediction");
  });
}

test("mobile: 랭킹은 셋째 탭이라 rank를 받고 돌려준다", () => {
  assert.equal(mobile.debateTabFrom("rank"), "rank");
  assert.equal(mobile.debateTabPath("rank"), "/debates?tab=rank");
});

test("web: rank는 탭이 아니라 기본 탭으로 떨어지고 옛 값은 LEGACY_RANK_TAB으로 알아본다", () => {
  assert.equal(web.debateTabFrom("rank"), "open");
  assert.equal(web.LEGACY_RANK_TAB, "rank");
});

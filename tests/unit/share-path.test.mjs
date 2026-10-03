/**
 * @file 공유 링크 유입 경로 회귀 테스트 (KAN-578). 공유 링크가 `unknown`으로 새지 않는 경계만 잡는다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SHARE_PATH,
  readPathParam,
  withSharePath,
} from "../../packages/core/src/analytics.ts";
import { resolveMarketing } from "../../packages/core/src/marketing.ts";

const params = (url) => new URL(url).searchParams;

test("공유 주소에 path=share를 붙이고 프록시가 그 값을 유입 경로로 읽는다", () => {
  const url = withSharePath("https://m.plick.co.kr/articles/12");
  assert.equal(url, "https://m.plick.co.kr/articles/12?path=share");
  assert.equal(readPathParam(params(url)), SHARE_PATH);
});

test("공유 링크 진입은 새 유입이라 지난 광고 값을 갈아엎는다", () => {
  const url = withSharePath("https://plick.co.kr/reels/7");
  const { touched, marketing } = resolveMarketing(
    { utmCampaign: "old", clickId: "IwAR0", clickSource: "meta" },
    params(url),
    null,
  );
  assert.equal(touched, true);
  assert.deepEqual(marketing, {});
});

test("기존 쿼리와 해시는 두고 합친다", () => {
  const url = withSharePath("https://plick.co.kr/articles/3?tab=comments#c9");
  const p = params(url);
  assert.equal(p.get("tab"), "comments");
  assert.equal(p.get("path"), "share");
  assert.equal(new URL(url).hash, "#c9");
});

test("path가 이미 있으면 덮거나 겹치지 않는다", () => {
  const src = "https://plick.co.kr/articles/3?path=insta&utm_campaign=A";
  assert.equal(withSharePath(src), src);
  assert.deepEqual(params(withSharePath(withSharePath(src))).getAll("path"), [
    "insta",
  ]);
  const tagged = withSharePath("https://plick.co.kr/reels/1");
  assert.equal(withSharePath(tagged), tagged);
});

test("utm_source만 있는 광고 링크도 원래 유입을 지키고 share로 덮지 않는다", () => {
  const src = "https://plick.co.kr/articles/3?utm_source=naver";
  assert.equal(withSharePath(src), src);
});

test("프록시가 버릴 빈 path나 형식 밖 path는 share 하나로 갈아 끼운다", () => {
  for (const bad of ["path=", "path=%20", "path=a%20b"]) {
    const url = withSharePath(`https://plick.co.kr/reels/1?${bad}`);
    assert.deepEqual(params(url).getAll("path"), ["share"], bad);
  }
});

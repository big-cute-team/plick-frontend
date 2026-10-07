/**
 * @file 외부 브라우저로 열기 링크의 기기 식별자 쿼리 회귀 테스트 (KAN-610). 기존 쿼리(utm)를 지우지
 * 않고 `did`만 더하거나 갈아 끼우는지, 식별자가 없으면 주소를 그대로 두는지 고정한다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEVICE_ID_QUERY_PARAM,
  withDeviceIdParam,
} from "../../packages/domain/src/cross-site.ts";

const DID = "6f9619ff-8b86-4d11-b42d-00c04fc964ff";

test("쿼리가 없으면 did 하나를 붙인다", () => {
  assert.equal(
    withDeviceIdParam("https://m.plick.co.kr/reels", DID),
    `https://m.plick.co.kr/reels?${DEVICE_ID_QUERY_PARAM}=${DID}`,
  );
});

test("utm 같은 기존 쿼리는 두고 did만 더한다", () => {
  const out = withDeviceIdParam(
    "https://m.plick.co.kr/?utm_source=insta&utm_campaign=oct",
    DID,
  );
  const url = new URL(out);
  assert.equal(url.searchParams.get("utm_source"), "insta");
  assert.equal(url.searchParams.get("utm_campaign"), "oct");
  assert.equal(url.searchParams.get(DEVICE_ID_QUERY_PARAM), DID);
});

test("이미 did가 있으면 갈아 끼우고 둘이 되지 않는다", () => {
  const out = withDeviceIdParam(
    `https://m.plick.co.kr/?${DEVICE_ID_QUERY_PARAM}=old`,
    DID,
  );
  assert.deepEqual(new URL(out).searchParams.getAll(DEVICE_ID_QUERY_PARAM), [
    DID,
  ]);
});

test("식별자가 없으면 주소를 그대로 돌려준다", () => {
  const href = "https://m.plick.co.kr/?utm_source=insta";
  assert.equal(withDeviceIdParam(href, null), href);
  assert.equal(withDeviceIdParam(href, undefined), href);
  assert.equal(withDeviceIdParam(href, ""), href);
});

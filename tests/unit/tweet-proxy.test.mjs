/**
 * @file 트윗 프록시 응답 압축(KAN-673). `Accept-Encoding` 협상, 압축 본문이 원래 JSON으로
 * 풀리는지, 작은 응답은 그대로 두는지, 길이와 Vary를 다는지 본다. 링크 파싱도 함께 본다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { brotliDecompressSync, gunzipSync } from "node:zlib";
import {
  compressedJson,
  pickEncoding,
  tweetProxyResponse,
} from "../../packages/core/src/tweet-proxy.ts";
import { tweetIdFromUrl } from "../../packages/core/src/tweet.ts";

/** 요청 헤더만 다른 가짜 요청 */
function req(acceptEncoding) {
  return new Request("http://localhost/api/tweet/1", {
    headers: acceptEncoding ? { "accept-encoding": acceptEncoding } : {},
  });
}

const BIG = { data: { text: "x".repeat(4000) } };

test("br을 gzip보다 먼저 고른다", () => {
  assert.equal(pickEncoding("gzip, deflate, br"), "br");
  assert.equal(pickEncoding("br,gzip"), "br");
});

test("q=0으로 거부한 인코딩은 고르지 않는다", () => {
  assert.equal(pickEncoding("br;q=0, gzip"), "gzip");
  assert.equal(pickEncoding("gzip;q=0"), "identity");
  assert.equal(pickEncoding("br; q = 0, gzip"), "gzip");
});

test("헤더가 없거나 모르는 인코딩이면 압축하지 않는다", () => {
  assert.equal(pickEncoding(null), "identity");
  assert.equal(pickEncoding("deflate"), "identity");
  assert.equal(pickEncoding("*"), "gzip");
});

test("gzip 요청은 gzip 본문과 길이, Vary를 받는다", async () => {
  const res = compressedJson(req("gzip"), BIG, 200, "public, max-age=60");
  assert.equal(res.headers.get("content-encoding"), "gzip");
  assert.equal(res.headers.get("vary"), "Accept-Encoding");
  assert.equal(res.headers.get("cache-control"), "public, max-age=60");
  const body = Buffer.from(await res.arrayBuffer());
  assert.equal(res.headers.get("content-length"), String(body.length));
  assert.deepEqual(JSON.parse(gunzipSync(body).toString()), BIG);
});

test("br 요청은 br 본문을 받는다", async () => {
  const res = compressedJson(req("br, gzip"), BIG, 200);
  assert.equal(res.headers.get("content-encoding"), "br");
  const body = Buffer.from(await res.arrayBuffer());
  assert.deepEqual(JSON.parse(brotliDecompressSync(body).toString()), BIG);
});

test("1KB 미만 응답과 압축을 안 받는 요청은 그대로 보낸다", async () => {
  const small = compressedJson(req("gzip"), { data: null }, 200);
  assert.equal(small.headers.get("content-encoding"), null);
  assert.equal(await small.text(), '{"data":null}');
  assert.equal(small.headers.get("content-length"), "13");

  const plain = compressedJson(req(null), BIG, 200);
  assert.equal(plain.headers.get("content-encoding"), null);
  assert.deepEqual(await plain.json(), BIG);
});

test("트윗 링크에서 status id를 뽑고 다른 도메인은 거른다", () => {
  assert.equal(
    tweetIdFromUrl("https://x.com/BBCMOTD/status/2076269946137608440"),
    "2076269946137608440",
  );
  assert.equal(tweetIdFromUrl("https://twitter.com/i/web/status/123"), "123");
  assert.equal(tweetIdFromUrl("https://fakex.com/a/status/123"), null);
});

test("숫자가 아닌 id는 신디케이션을 부르지 않고 400 no-store다", async () => {
  const res = await tweetProxyResponse(req("gzip"), "abc");
  assert.equal(res.status, 400);
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.deepEqual(await res.json(), { data: null });
});

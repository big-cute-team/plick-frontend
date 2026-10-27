/**
 * @file `@plick/core/viewer-ip` 회귀 테스트 (KAN-680). CloudFront가 적어 준 방문자 주소에서 포트를
 * 떼는 규칙과, 그 값이 없을 때 아무것도 싣지 않는 경계를 고정한다. 틀어지면 BE 상한의 주체가
 * 바뀌는 자리라 화면에서는 안 보인다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  stripViewerPort,
  viewerForwardedHeaders,
} from "../../packages/core/src/viewer-ip.ts";

test("IPv4와 IPv6(대괄호 유무)에서 포트만 뗀다", () => {
  assert.equal(stripViewerPort("198.51.100.10:46532"), "198.51.100.10");
  assert.equal(stripViewerPort("[2001:db8::1]:443"), "2001:db8::1");
  assert.equal(stripViewerPort("2001:db8::1:443"), "2001:db8::1");
  assert.equal(stripViewerPort("[2001:db8::1]"), "2001:db8::1");
  /* 포트가 없으면 그대로 */
  assert.equal(stripViewerPort("198.51.100.10"), "198.51.100.10");
});

test("빈 값과 체인 주입이 될 수 있는 값은 버린다", () => {
  assert.equal(stripViewerPort(null), null);
  assert.equal(stripViewerPort(undefined), null);
  assert.equal(stripViewerPort(""), null);
  assert.equal(stripViewerPort("   "), null);
  /* 쉼표나 공백이 들어오면 BE가 첫 값만 보는 체인이 된다 */
  assert.equal(stripViewerPort("1.2.3.4, 5.6.7.8:1"), null);
  assert.equal(stripViewerPort("1.2.3.4:abc"), null);
  assert.equal(stripViewerPort(":443"), null);
});

test("CloudFront 헤더가 있을 때만 X-Forwarded-For 하나를 싣는다", () => {
  const withViewer = new Headers({
    "x-forwarded-for": "1.2.3.4, 203.0.113.7, 13.224.0.10",
    "cloudfront-viewer-address": "203.0.113.7:51234",
  });
  assert.deepEqual(viewerForwardedHeaders(withViewer), {
    "X-Forwarded-For": "203.0.113.7",
  });
  /* 체인만 있고 CloudFront 값이 없으면 체인을 넘기지 않는다 */
  const chainOnly = new Headers({ "x-forwarded-for": "1.2.3.4, 203.0.113.7" });
  assert.deepEqual(viewerForwardedHeaders(chainOnly), {});
  assert.deepEqual(viewerForwardedHeaders(new Headers()), {});
});

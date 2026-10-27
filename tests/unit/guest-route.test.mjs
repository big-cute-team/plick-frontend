/**
 * @file 게스트 발급 라우트 `POST /api/session/guest` (KAN-665, KAN-667, KAN-675). 두 앱의 실제
 * `route.ts`에 같은 케이스를 건다. 크롤러·다른 출처 거절, 세션이 있을 때 표식만 보정, 발급 성공 시
 * 쿠키 다섯 개와 `no-store`, BE 실패 시 503을 본다. BE는 전역 `fetch`를 가짜로 바꿔 대신한다.
 */
import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  APPS,
  CRAWLER_UA,
  beError,
  beOk,
  loadApp,
  setCookies,
  stubFetch,
} from "./support/next-app.mjs";

const GUEST = {
  accessToken: "guest-access",
  refreshToken: "guest-refresh",
  needsOnboarding: true,
  isGuest: true,
  guestExpiresAt: "2099-11-10T12:00:00+09:00",
};

const NO_STORE = "private, no-store";

let stub = null;
afterEach(() => {
  stub?.restore();
  stub = null;
});

for (const app of APPS) {
  describe(`${app.name} 게스트 발급 라우트`, async () => {
    const { POST, constants: c, makeRequest } = await loadApp(app.name);
    const url = `https://${app.host}/api/session/guest`;

    /** 같은 출처에서 온 발급 요청 */
    function post({ headers = {}, cookies = {} } = {}) {
      return makeRequest(url, {
        method: "POST",
        headers: { "sec-fetch-site": "same-origin", ...headers },
        cookies,
      });
    }

    test("크롤러 UA는 403이고 BE를 부르지 않는다", async () => {
      stub = stubFetch(() => beOk(GUEST));
      const res = await POST(post({ headers: { "user-agent": CRAWLER_UA } }));
      assert.equal(res.status, 403);
      assert.equal(res.headers.get("cache-control"), NO_STORE);
      assert.equal(stub.calls.length, 0);
      assert.deepEqual(res.headers.getSetCookie(), []);
    });

    test("다른 사이트에서 온 POST는 403이다", async () => {
      stub = stubFetch(() => beOk(GUEST));
      const res = await POST(
        post({ headers: { "sec-fetch-site": "cross-site" } }),
      );
      assert.equal(res.status, 403);
      assert.equal(stub.calls.length, 0);
    });

    test("Sec-Fetch-Site가 없으면 Origin 호스트를 Host와 맞춘다", async () => {
      stub = stubFetch(() => beOk(GUEST));
      const foreign = await POST(
        makeRequest(url, {
          method: "POST",
          headers: { origin: "https://evil.example", host: app.host },
        }),
      );
      assert.equal(foreign.status, 403);
      const none = await POST(
        makeRequest(url, { method: "POST", headers: { host: app.host } }),
      );
      assert.equal(none.status, 403);
      const same = await POST(
        makeRequest(url, {
          method: "POST",
          headers: { origin: `https://${app.host}`, host: app.host },
        }),
      );
      assert.equal(same.status, 200);
    });

    test("세션이 있으면 발급하지 않고 issued: false로 답한다", async () => {
      stub = stubFetch(() => beOk(GUEST));
      const res = await POST(
        post({
          cookies: {
            [c.AUTH_COOKIES.access]: "a",
            [c.AUTH_COOKIES.refresh]: "r",
            [c.SESSION_KIND_COOKIE]: c.SESSION_KIND.user,
          },
        }),
      );
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), { issued: false });
      assert.equal(res.headers.get("cache-control"), NO_STORE);
      assert.equal(stub.calls.length, 0);
      assert.deepEqual(res.headers.getSetCookie(), []);
    });

    test("세션 표식이 없는 옛 세션은 마감 쿠키로 종류를 정해 표식만 심는다", async () => {
      stub = stubFetch(() => beOk(GUEST));
      const guest = await POST(
        post({
          cookies: {
            [c.AUTH_COOKIES.refresh]: "r",
            [c.GUEST_EXPIRES_COOKIE]: GUEST.guestExpiresAt,
          },
        }),
      );
      assert.deepEqual(Object.keys(setCookies(guest)), [c.SESSION_KIND_COOKIE]);
      assert.equal(
        setCookies(guest)[c.SESSION_KIND_COOKIE].value,
        c.SESSION_KIND.guest,
      );

      const user = await POST(
        post({ cookies: { [c.AUTH_COOKIES.access]: "a" } }),
      );
      assert.equal(
        setCookies(user)[c.SESSION_KIND_COOKIE].value,
        c.SESSION_KIND.user,
      );
      assert.equal(stub.calls.length, 0);
    });

    test("발급에 성공하면 쿠키 다섯 개를 심고 no-store로 답한다", async () => {
      stub = stubFetch(() => beOk(GUEST));
      const res = await POST(post());
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), { issued: true });
      assert.equal(res.headers.get("cache-control"), NO_STORE);

      const cookies = setCookies(res);
      assert.deepEqual(
        Object.keys(cookies).sort(),
        [
          c.AUTH_COOKIES.access,
          c.AUTH_COOKIES.refresh,
          c.GUEST_EXPIRES_COOKIE,
          c.GUEST_NOTICE_COOKIE,
          c.SESSION_KIND_COOKIE,
        ].sort(),
      );
      assert.equal(cookies[c.AUTH_COOKIES.access].value, GUEST.accessToken);
      assert.equal(cookies[c.AUTH_COOKIES.refresh].value, GUEST.refreshToken);
      assert.equal(cookies[c.GUEST_EXPIRES_COOKIE].value, GUEST.guestExpiresAt);
      assert.equal(cookies[c.SESSION_KIND_COOKIE].value, c.SESSION_KIND.guest);
      assert.equal(cookies[c.GUEST_NOTICE_COOKIE].value, c.GUEST_NOTICE.issued);
      /* 토큰은 JS가 못 읽고, 브라우저가 읽는 표식 셋은 읽을 수 있어야 한다 */
      assert.equal(cookies[c.AUTH_COOKIES.access].httpOnly, true);
      assert.equal(cookies[c.AUTH_COOKIES.refresh].httpOnly, true);
      assert.equal(cookies[c.GUEST_EXPIRES_COOKIE].httpOnly, false);
      assert.equal(cookies[c.SESSION_KIND_COOKIE].httpOnly, false);
      assert.equal(cookies[c.GUEST_NOTICE_COOKIE].httpOnly, false);
    });

    test("발급 호출에 쿠키에서 읽은 분석 헤더를 싣는다", async () => {
      stub = stubFetch(() => beOk(GUEST));
      const device = "0b6f3a52-6c1e-4c39-9a4e-0d2b6a7f1c11";
      await POST(post({ cookies: { plick_path: "insta", plick_did: device } }));
      assert.equal(stub.calls.length, 1);
      const { path, init, headers } = stub.calls[0];
      assert.equal(path, "/api/v1/auth/guest");
      assert.equal(init.method, "POST");
      assert.equal(headers.get("X-Plick-Path"), "insta");
      assert.equal(headers.get("X-Plick-Device"), device);
      assert.equal(headers.get("X-Plick-Client"), app.client);
      assert.equal(headers.get("X-Plick-Bot"), null);
    });

    test("발급 호출에 CloudFront가 본 방문자 IP를 X-Forwarded-For로 싣는다 (KAN-680)", async () => {
      stub = stubFetch(() => beOk(GUEST));
      await POST(
        post({
          headers: {
            /* 뷰어가 지어낸 값, CloudFront가 본 방문자 IP, CloudFront 엣지 IP(ALB가 덧붙임) 순 */
            "x-forwarded-for": "1.2.3.4, 203.0.113.7, 13.224.0.10",
            "cloudfront-viewer-address": "203.0.113.7:51234",
          },
        }),
      );
      assert.equal(stub.calls.length, 1);
      const { headers } = stub.calls[0];
      /* BE 상한이 방문자별로 세려면 체인이 아니라 믿을 수 있는 값 하나만 실려야 한다 */
      assert.equal(headers.get("X-Forwarded-For"), "203.0.113.7");
    });

    test("CloudFront 헤더가 없으면 들어온 X-Forwarded-For 체인을 넘기지 않는다 (KAN-680)", async () => {
      stub = stubFetch(() => beOk(GUEST));
      /* 로컬이나 정책 미적용 배포. 체인의 첫 값은 요청자가 지어낼 수 있어 그대로 넘기면 상한이 사라진다 */
      await POST(
        post({ headers: { "x-forwarded-for": "1.2.3.4, 203.0.113.7" } }),
      );
      assert.equal(stub.calls.length, 1);
      assert.equal(stub.calls[0].headers.get("X-Forwarded-For"), null);
    });

    test("IPv6 방문자 주소도 포트만 떼서 싣는다 (KAN-680)", async () => {
      for (const [raw, ip] of [
        ["[2001:db8::1]:443", "2001:db8::1"],
        ["2001:db8::1:443", "2001:db8::1"],
      ]) {
        stub = stubFetch(() => beOk(GUEST));
        await POST(post({ headers: { "cloudfront-viewer-address": raw } }));
        assert.equal(stub.calls[0].headers.get("X-Forwarded-For"), ip, raw);
        stub.restore();
      }
      stub = null;
    });

    test("자연 발급은 로그아웃 출신 표식과 재시도 가드를 지운다", async () => {
      stub = stubFetch(() => beOk(GUEST));
      const res = await POST(
        post({
          cookies: {
            [c.REFRESH_RETRY_COOKIE]: "1",
            [c.GUEST_FROM_LOGOUT_COOKIE]: "1",
          },
        }),
      );
      const cookies = setCookies(res);
      assert.equal(cookies[c.REFRESH_RETRY_COOKIE].deleted, true);
      assert.equal(cookies[c.GUEST_FROM_LOGOUT_COOKIE].deleted, true);
    });

    test("BE가 실패하면 503이고 쿠키를 건드리지 않는다", async (t) => {
      t.mock.method(console, "error", () => {});
      for (const handler of [
        () => beError(429, "COMMON_RATE_LIMITED"),
        () => beError(500, "COMMON_INTERNAL_ERROR"),
        () => {
          throw new TypeError("fetch failed");
        },
      ]) {
        stub = stubFetch(handler);
        const res = await POST(post());
        assert.equal(res.status, 503);
        assert.deepEqual(await res.json(), { issued: false });
        assert.equal(res.headers.get("cache-control"), NO_STORE);
        assert.deepEqual(res.headers.getSetCookie(), []);
        stub.restore();
      }
      stub = null;
    });
  });
}

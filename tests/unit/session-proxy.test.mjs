/**
 * @file 세션 프록시의 쿠키·캐시 분기 (KAN-665, KAN-667, KAN-675). 두 앱의 실제 `proxy.ts`에 같은
 * 케이스를 건다. 페이지 응답에는 쿠키가 없어야 CDN이 문서를 저장해 남에게 줄 수 있고, 쿠키를 심거나
 * 지우는 응답은 `private, no-store`여야 한 사람의 토큰이 다음 사람에게 나가지 않는다.
 * BE 재발급은 전역 `fetch`를 가짜로 바꿔 대신한다.
 */
import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  APPS,
  BE_BASE,
  CRAWLER_UA,
  beError,
  beOk,
  loadApp,
  setCookies,
  stubFetch,
} from "./support/next-app.mjs";

const NO_STORE = "private, no-store";
const EXPIRES = "2026-11-10T12:00:00+09:00";

let stub = null;
afterEach(() => {
  stub?.restore();
  stub = null;
});

/** 재발급 공유 캐시(`refreshTokensShared`)가 케이스 사이에 섞이지 않게 refresh 토큰을 매번 새로 만든다 */
let seq = 0;
function freshToken() {
  seq += 1;
  return `refresh-${seq}`;
}

for (const app of APPS) {
  describe(`${app.name} 세션 프록시`, async () => {
    const { proxy, constants: c, makeRequest } = await loadApp(app.name);
    const origin = `https://${app.host}`;

    test("토큰 없는 페이지 요청은 쿠키를 심지 않고 캐시 헤더도 건드리지 않는다", async () => {
      stub = stubFetch(() => assert.fail("BE를 부르면 안 된다"));
      const res = await proxy(
        makeRequest(`${origin}/?path=insta&utm_campaign=fall&fbclid=AbC`, {
          headers: { referer: "https://l.instagram.com/" },
        }),
      );
      assert.deepEqual(res.headers.getSetCookie(), []);
      assert.equal(res.headers.get("cache-control"), null);
      assert.equal(res.headers.get("x-middleware-next"), "1");
      /* 쿠키는 안 심어도 이번 렌더의 헤더에는 진입 주소의 유입 값이 실린다 */
      assert.equal(
        res.headers.get("x-middleware-request-x-plick-path"),
        "insta",
      );
    });

    test("access가 살아 있는 /be 요청은 Bearer를 싣고 쿠키는 없다", async () => {
      stub = stubFetch(() => assert.fail("BE를 부르면 안 된다"));
      const res = await proxy(
        makeRequest(`${origin}/be/api/v1/reels`, {
          cookies: {
            [c.AUTH_COOKIES.access]: "live-access",
            [c.AUTH_COOKIES.refresh]: "r",
          },
        }),
      );
      assert.equal(
        res.headers.get("x-middleware-request-authorization"),
        "Bearer live-access",
      );
      assert.deepEqual(res.headers.getSetCookie(), []);
      assert.equal(res.headers.get("cache-control"), null);
    });

    test("게스트 재발급 응답은 회전된 쌍과 표식을 심고 no-store다", async () => {
      const token = freshToken();
      stub = stubFetch((path) => {
        assert.equal(path, "/api/v1/auth/refresh");
        return beOk({
          accessToken: "new-access",
          refreshToken: "new-refresh",
          guestExpiresAt: EXPIRES,
        });
      });
      const res = await proxy(
        makeRequest(`${origin}/`, {
          cookies: {
            [c.AUTH_COOKIES.refresh]: token,
            [c.GUEST_EXPIRES_COOKIE]: EXPIRES,
          },
        }),
      );
      assert.equal(res.headers.get("cache-control"), NO_STORE);
      const cookies = setCookies(res);
      assert.equal(cookies[c.AUTH_COOKIES.access].value, "new-access");
      assert.equal(cookies[c.AUTH_COOKIES.refresh].value, "new-refresh");
      assert.equal(cookies[c.GUEST_EXPIRES_COOKIE].value, EXPIRES);
      assert.equal(cookies[c.SESSION_KIND_COOKIE].value, c.SESSION_KIND.guest);
    });

    test("소셜 재발급은 마감 표식을 지우고 종류를 user로 바꾼다", async () => {
      stub = stubFetch(() =>
        beOk({
          accessToken: "new-access",
          refreshToken: "new-refresh",
          guestExpiresAt: null,
        }),
      );
      const res = await proxy(
        makeRequest(`${origin}/be/api/v1/me`, {
          cookies: {
            [c.AUTH_COOKIES.refresh]: freshToken(),
            [c.GUEST_EXPIRES_COOKIE]: EXPIRES,
          },
        }),
      );
      assert.equal(res.headers.get("cache-control"), NO_STORE);
      const cookies = setCookies(res);
      assert.equal(cookies[c.GUEST_EXPIRES_COOKIE].deleted, true);
      assert.equal(cookies[c.SESSION_KIND_COOKIE].value, c.SESSION_KIND.user);
      /* 쿠키를 심는 /be 응답은 config rewrites가 아니라 BE로 직접 rewrite해야 Set-Cookie가 산다 */
      assert.equal(
        res.headers.get("x-middleware-rewrite"),
        `${BE_BASE}/api/v1/me`,
      );
      assert.equal(
        res.headers.get("x-middleware-request-authorization"),
        "Bearer new-access",
      );
    });

    test("랜딩 쿠키를 든 /be 요청은 유입·마케팅 쿠키를 심고 랜딩 쿠키를 지운다", async () => {
      stub = stubFetch(() => assert.fail("BE를 부르면 안 된다"));
      const res = await proxy(
        makeRequest(`${origin}/be/api/v1/events`, {
          method: "POST",
          cookies: {
            plick_landing:
              "?path=insta&utm_campaign=fall&fbclid=AbC\nhttps://l.instagram.com",
          },
        }),
      );
      assert.equal(res.headers.get("cache-control"), NO_STORE);
      const cookies = setCookies(res);
      assert.equal(cookies.plick_landing.deleted, true);
      assert.equal(cookies.plick_path.value, "insta");
      assert.equal(cookies.plick_path.httpOnly, true);
      assert.ok(cookies.plick_mkt.value.length > 0);
      assert.equal(
        res.headers.get("x-middleware-rewrite"),
        `${BE_BASE}/api/v1/events`,
      );
      assert.equal(
        res.headers.get("x-middleware-request-x-plick-utm-campaign"),
        "fall",
      );
    });

    test("크롤러의 /be 요청은 랜딩 쿠키가 있어도 유입 쿠키를 심지 않는다", async () => {
      stub = stubFetch(() => assert.fail("BE를 부르면 안 된다"));
      const res = await proxy(
        makeRequest(`${origin}/be/api/v1/reels`, {
          headers: { "user-agent": CRAWLER_UA },
          cookies: { plick_landing: "?path=insta\n" },
        }),
      );
      const cookies = setCookies(res);
      assert.equal(cookies.plick_path, undefined);
      assert.equal(cookies.plick_mkt, undefined);
    });

    test("크롤러의 분석 쓰기는 BE로 보내지 않고 204다", async () => {
      stub = stubFetch(() => assert.fail("BE를 부르면 안 된다"));
      const res = await proxy(
        makeRequest(`${origin}/be/api/v1/events`, {
          method: "POST",
          headers: { "user-agent": CRAWLER_UA },
        }),
      );
      assert.equal(res.status, 204);
    });

    test("재발급이 401이면 첫 번째는 같은 주소로 한 번 다시 보낸다", async () => {
      stub = stubFetch(() => beError(401, "AUTH_INVALID_TOKEN"));
      const res = await proxy(
        makeRequest(`${origin}/articles/1`, {
          cookies: { [c.AUTH_COOKIES.refresh]: freshToken() },
        }),
      );
      assert.equal(res.status, 307);
      assert.equal(res.headers.get("location"), `${origin}/articles/1`);
      assert.equal(setCookies(res)[c.REFRESH_RETRY_COOKIE].value, "1");
      assert.equal(res.headers.get("cache-control"), NO_STORE);
    });

    test("게스트 마감(두 번째 401)이면 세션 쿠키를 전부 지우고 익명으로 통과시킨다", async () => {
      stub = stubFetch(() => beError(401, "AUTH_INVALID_TOKEN"));
      const res = await proxy(
        makeRequest(`${origin}/articles/1`, {
          cookies: {
            [c.AUTH_COOKIES.refresh]: freshToken(),
            [c.GUEST_EXPIRES_COOKIE]: EXPIRES,
            [c.SESSION_KIND_COOKIE]: c.SESSION_KIND.guest,
            [c.REFRESH_RETRY_COOKIE]: "1",
          },
        }),
      );
      assert.equal(res.headers.get("x-middleware-next"), "1");
      assert.equal(res.headers.get("cache-control"), NO_STORE);
      const cookies = setCookies(res);
      for (const name of [
        c.AUTH_COOKIES.access,
        c.AUTH_COOKIES.refresh,
        c.GUEST_EXPIRES_COOKIE,
        c.SESSION_KIND_COOKIE,
        c.GUEST_FROM_LOGOUT_COOKIE,
        c.REFRESH_RETRY_COOKIE,
      ]) {
        assert.equal(cookies[name]?.deleted, true, `${name}을 지워야 한다`);
      }
    });

    test("소셜 세션의 두 번째 401은 쿠키를 지우고 로그인으로 보낸다", async () => {
      stub = stubFetch(() => beError(401, "AUTH_INVALID_TOKEN"));
      const res = await proxy(
        makeRequest(`${origin}/articles/1`, {
          cookies: {
            [c.AUTH_COOKIES.refresh]: freshToken(),
            [c.SESSION_KIND_COOKIE]: c.SESSION_KIND.user,
            [c.REFRESH_RETRY_COOKIE]: "1",
          },
        }),
      );
      assert.equal(res.headers.get("location"), `${origin}/login`);
      assert.equal(res.headers.get("cache-control"), NO_STORE);
      const cookies = setCookies(res);
      assert.equal(cookies[c.AUTH_COOKIES.refresh].deleted, true);
      assert.equal(cookies[c.SESSION_KIND_COOKIE].deleted, true);
    });

    test("재발급이 5xx면 쿠키를 지우지 않고 익명으로 통과시킨다", async () => {
      stub = stubFetch(() => beError(503, "COMMON_UNAVAILABLE"));
      const res = await proxy(
        makeRequest(`${origin}/`, {
          cookies: { [c.AUTH_COOKIES.refresh]: freshToken() },
        }),
      );
      assert.equal(res.headers.get("x-middleware-next"), "1");
      assert.deepEqual(res.headers.getSetCookie(), []);
      assert.equal(res.headers.get("cache-control"), null);
    });
  });
}

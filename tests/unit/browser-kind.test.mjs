/**
 * @file 인앱 브라우저 판별 회귀 테스트 (KAN-610). `X-Plick-Browser` 값이 UA 표본에서 바뀌지 않게 한다.
 * 표본은 prod ALB 액세스 로그와 각 앱의 공개 UA 형식에서 땄다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ANALYTICS_HEADERS,
  ANALYTICS_HEADER_NAMES,
  BROWSER_KINDS,
  EXTERNAL_BROWSER_SUGGEST_KINDS,
  resolveBrowserKind,
} from "../../packages/core/src/analytics.ts";

const UA = {
  instagramAndroid:
    "Mozilla/5.0 (Linux; Android 14; SM-S921N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.107 Mobile Safari/537.36 Instagram 356.0.0.41.101 Android (34/14; 450dpi; 1080x2115; samsung; SM-S921N; e1q; s5e9945; ko_KR; 652874720)",
  instagramIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 356.0.0.21.101 (iPhone16,2; iOS 18_0; ko_KR; ko; scale=3.00; 1290x2796; 652874720)",
  facebookAndroid:
    "Mozilla/5.0 (Linux; Android 13; SM-A536N Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.107 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/485.0.0.60.70;]",
  facebookIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/480.0.0.44.108;FBBV/640291962;FBDV/iPhone15,3;FBMD/iPhone;FBSN/iOS;FBSV/17.6;FBSS/3;FBID/phone;FBLC/ko_KR;FBOP/5]",
  kakaotalk:
    "Mozilla/5.0 (Linux; Android 14; SM-S911N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.107 Mobile Safari/537.36;KAKAOTALK 10.9.5",
  naver:
    "Mozilla/5.0 (Linux; Android 14; SM-S921N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.107 Mobile Safari/537.36 NAVER(inapp; search; 2000; 12.10.3)",
  line: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/14.12.0",
  plickApp:
    "Mozilla/5.0 (Linux; Android 14; SM-S921N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.107 Mobile Safari/537.36 PlickApp/1.2.0",
  androidWebView:
    "Mozilla/5.0 (Linux; Android 10; K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.0.0 Mobile Safari/537.36",
  iosWebView:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
  androidChrome:
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
  iosSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  iosChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1",
  desktopChrome:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  googlebot:
    "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
};

test("이름이 있는 인앱은 그 이름으로 가른다", () => {
  assert.equal(resolveBrowserKind(UA.instagramAndroid), "instagram");
  assert.equal(resolveBrowserKind(UA.instagramIos), "instagram");
  assert.equal(resolveBrowserKind(UA.facebookAndroid), "facebook");
  assert.equal(resolveBrowserKind(UA.facebookIos), "facebook");
  assert.equal(resolveBrowserKind(UA.kakaotalk), "kakaotalk");
  assert.equal(resolveBrowserKind(UA.naver), "naver");
  assert.equal(resolveBrowserKind(UA.line), "line");
});

test("우리 앱 셸은 인앱이어도 plick_app이다", () => {
  assert.equal(resolveBrowserKind(UA.plickApp), "plick_app");
  assert.equal(resolveBrowserKind("Mozilla/5.0 (...) PlickApp"), "plick_app");
});

test("이름 없는 웹뷰는 other_inapp, 그 밖은 전부 browser다", () => {
  assert.equal(resolveBrowserKind(UA.androidWebView), "other_inapp");
  assert.equal(resolveBrowserKind(UA.iosWebView), "other_inapp");
  assert.equal(resolveBrowserKind(UA.androidChrome), "browser");
  assert.equal(resolveBrowserKind(UA.iosSafari), "browser");
  /* 크롬·파이어폭스 iOS는 Safari/ 토큰이 있어 웹뷰로 안 잡힌다 */
  assert.equal(resolveBrowserKind(UA.iosChrome), "browser");
  assert.equal(resolveBrowserKind(UA.desktopChrome), "browser");
  assert.equal(resolveBrowserKind(UA.googlebot), "browser");
  assert.equal(resolveBrowserKind(""), "browser");
});

test("값은 BE 형식([a-z0-9_]{1,32})에 맞고 목록 안에 있다", () => {
  for (const kind of BROWSER_KINDS) assert.match(kind, /^[a-z0-9_]{1,32}$/);
  for (const ua of Object.values(UA)) {
    assert.ok(BROWSER_KINDS.includes(resolveBrowserKind(ua)));
  }
  for (const kind of EXTERNAL_BROWSER_SUGGEST_KINDS) {
    assert.ok(BROWSER_KINDS.includes(kind));
  }
});

test("X-Plick-Browser가 서버 fetch가 옮겨 싣는 헤더 목록에 든다", () => {
  assert.equal(ANALYTICS_HEADERS.browser, "X-Plick-Browser");
  assert.ok(ANALYTICS_HEADER_NAMES.includes("X-Plick-Browser"));
});

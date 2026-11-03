/**
 * @file 모바일 OS 판별 회귀 테스트 (KAN-711). 앱 다운로드 팝업이 스토어 버튼을 보일 기기와 안 보일
 * 기기가 UA 표본에서 바뀌지 않게 한다. 표본은 browser-kind 테스트와 같은 출처다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveMobileOs } from "../../packages/core/src/analytics.ts";

const UA = {
  androidChrome:
    "Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
  instagramAndroid:
    "Mozilla/5.0 (Linux; Android 14; SM-S921N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.107 Mobile Safari/537.36 Instagram 356.0.0.41.101 Android (34/14; 450dpi; 1080x2115; samsung; SM-S921N; e1q; s5e9945; ko_KR; 652874720)",
  iphoneSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  instagramIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 356.0.0.21.101 (iPhone16,2; iOS 18_0; ko_KR; ko; scale=3.00; 1290x2796; 652874720)",
  ipadDesktopMode:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  macSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  windowsChrome:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  googlebotMobile:
    "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
};

test("안드로이드 UA는 크롬이든 인앱이든 android", () => {
  assert.equal(resolveMobileOs(UA.androidChrome), "android");
  assert.equal(resolveMobileOs(UA.instagramAndroid), "android");
});

test("아이폰 UA는 사파리든 인앱이든 ios", () => {
  assert.equal(resolveMobileOs(UA.iphoneSafari), "ios");
  assert.equal(resolveMobileOs(UA.instagramIos), "ios");
});

test("데스크톱 UA는 null", () => {
  assert.equal(resolveMobileOs(UA.macSafari), null);
  assert.equal(resolveMobileOs(UA.macSafari, 0), null);
  assert.equal(resolveMobileOs(UA.windowsChrome), null);
  assert.equal(resolveMobileOs(""), null);
});

test("아이패드 데스크톱 모드 UA는 터치 포인트가 있을 때만 ios", () => {
  assert.equal(resolveMobileOs(UA.ipadDesktopMode, 5), "ios");
  assert.equal(resolveMobileOs(UA.ipadDesktopMode, 0), null);
});

test("모바일 크롤러 UA도 OS는 읽힌다 (크롤러 제외는 호출부 몫)", () => {
  assert.equal(resolveMobileOs(UA.googlebotMobile), "android");
});

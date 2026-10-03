/**
 * @file 진입 화면과 화면 표, 크롤러 판정 회귀 테스트 (KAN-584). AX 지표가 조용히 틀어지는 경계만 잡는다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ENTRY_POINTS,
  isEntryPoint,
  resolveEntryPoint,
} from "../../packages/core/src/analytics.ts";
import { resolveScreen } from "../../packages/core/src/screens.ts";

const q = (s) => new URLSearchParams(s);

test("주소로 정하는 진입 화면 넷", () => {
  assert.equal(resolveEntryPoint("/"), "home_feed");
  assert.equal(resolveEntryPoint("/reels"), "reels");
  assert.equal(resolveEntryPoint("/reels/8032"), "reels_deeplink");
  assert.equal(resolveEntryPoint("/articles/12"), null);
  assert.equal(resolveEntryPoint("/teams/arsenal"), null);
});

test("공유 표식이 있으면 경로보다 share_link가 앞선다", () => {
  assert.equal(
    resolveEntryPoint("/articles/12", q("path=share")),
    "share_link",
  );
  assert.equal(resolveEntryPoint("/reels/8032", q("path=share")), "share_link");
  /* 프록시가 버리는 빈·형식 밖 path는 표식이 아니다 */
  assert.equal(resolveEntryPoint("/articles/12", q("path=")), null);
  assert.equal(resolveEntryPoint("/", q("path=insta")), "home_feed");
});

test("진입 화면 값은 KAN-542의 다섯 개만 받는다", () => {
  for (const value of ENTRY_POINTS) assert.equal(isEntryPoint(value), true);
  assert.equal(isEntryPoint("home"), false);
  assert.equal(isEntryPoint(""), false);
  assert.equal(isEntryPoint(undefined), false);
});

test("라이브 팀 필터와 채팅도 화면 표에 있다", () => {
  assert.deepEqual(resolveScreen("/live/teams/42"), {
    screen: "live",
    ref: "42",
  });
  assert.deepEqual(resolveScreen("/live/chat"), { screen: "live" });
  assert.deepEqual(resolveScreen("/live/matches/1208384"), {
    screen: "match_detail",
    ref: "1208384",
  });
});

/** prod ALB 로그(2026-10-02)에서 실제로 본 UA들. JS를 돌려 이벤트까지 보내던 크롤러가 앞의 셋이다 */
const CRAWLERS = [
  "Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)",
  "meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)",
  "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "python-requests/2.31",
  "curl/8.4.0",
  "Mozilla/5.0 (compatible; Daum/4.1; +http://cs.daum.net/faq/15/4118.html?faqId=28966)",
  "Chrome Privacy Preserving Prefetch Proxy",
];

/** 사람이 쓰는 브라우저. 네이버·카카오·인스타그램 앱의 인앱 브라우저가 크롤러로 잡히면 안 된다 */
const HUMANS = [
  "Mozilla/5.0 (iPhone; CPU iPhone OS 26_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 16; SM-S931N Build/BP4A.251205.006; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/141.0.0.0 Mobile Safari/537.36 Instagram 400.0.0.0",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 NAVER(inapp; search; 2000; 12.10.3; 15PRO)",
  "Mozilla/5.0 (Linux; Android 14; SM-A156L Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/141.0.0.0 Mobile Safari/537.36;KAKAOTALK 25.9.1",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
];

for (const app of ["mobile", "web"]) {
  test(`${app} 크롤러 패턴이 JS 돌리는 크롤러를 잡고 인앱 브라우저는 놓아준다`, async () => {
    const { CRAWLER_UA_PATTERN } = await import(
      new URL(`../../apps/${app}/app/_constants/api.ts`, import.meta.url)
    );
    for (const ua of CRAWLERS)
      assert.equal(CRAWLER_UA_PATTERN.test(ua), true, ua);
    for (const ua of HUMANS)
      assert.equal(CRAWLER_UA_PATTERN.test(ua), false, ua);
  });
}

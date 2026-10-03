/**
 * @file 진입 화면과 화면 표, 크롤러 판정 회귀 테스트 (KAN-584). AX 지표가 조용히 틀어지는 경계만 잡는다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ENTRY_POINTS,
  isAnalyticsWrite,
  isEntryPoint,
  resolveEntryPoint,
  resolveRequestEntry,
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

/** 프록시가 넘기는 모양을 흉내 낸다. 안 넘긴 칸은 "없음"이다 */
const req = (over) => ({
  isProxy: false,
  isRsc: false,
  pathname: "/articles/12",
  searchParams: q(""),
  referer: null,
  handed: undefined,
  ...over,
});

test("페이지 요청: 일회용 쿠키가 주소와 Referer를 이기고 읽히면 지워진다", () => {
  assert.deepEqual(
    resolveRequestEntry(
      req({ handed: "hot", isRsc: true, referer: "https://m.plick.co.kr/" }),
    ),
    { entry: "hot", consumed: true },
  );
  /* 릴스 경로로 왔어도 쿠키가 먼저다 */
  assert.deepEqual(
    resolveRequestEntry(req({ handed: "home_feed", pathname: "/reels" })),
    { entry: "home_feed", consumed: true },
  );
  /* 고친 쿠키 값은 없는 것과 같다. 지우지도 않는다(어차피 30초면 사라진다) */
  assert.deepEqual(
    resolveRequestEntry(req({ handed: "admin", pathname: "/reels" })),
    { entry: "reels", consumed: false },
  );
});

test("페이지 요청: 쿠키가 없으면 주소, 그다음 소프트 내비게이션의 Referer", () => {
  assert.deepEqual(
    resolveRequestEntry(
      req({
        pathname: "/",
        isRsc: true,
        referer: "https://m.plick.co.kr/reels",
      }),
    ),
    { entry: "home_feed", consumed: false },
  );
  assert.deepEqual(
    resolveRequestEntry(req({ searchParams: q("path=share") })),
    { entry: "share_link", consumed: false },
  );
  assert.deepEqual(
    resolveRequestEntry(
      req({ isRsc: true, referer: "https://m.plick.co.kr/" }),
    ),
    { entry: "home_feed", consumed: false },
  );
  /* 전체 로드로 바로 연 기사. 외부 Referer는 화면이 아니다 */
  assert.deepEqual(
    resolveRequestEntry(req({ referer: "https://www.google.com/" })),
    { entry: null, consumed: false },
  );
  assert.deepEqual(resolveRequestEntry(req({ isRsc: true, referer: null })), {
    entry: null,
    consumed: false,
  });
  assert.deepEqual(
    resolveRequestEntry(req({ isRsc: true, referer: "not a url" })),
    { entry: null, consumed: false },
  );
});

test("/be fetch: Referer만 보고 쿠키는 읽지도 지우지도 않는다", () => {
  assert.deepEqual(
    resolveRequestEntry(
      req({
        isProxy: true,
        handed: "hot",
        referer: "https://m.plick.co.kr/reels/8032",
      }),
    ),
    { entry: "reels_deeplink", consumed: false },
  );
  assert.deepEqual(
    resolveRequestEntry(
      req({
        isProxy: true,
        referer: "https://m.plick.co.kr/articles/12?path=share",
      }),
    ),
    { entry: "share_link", consumed: false },
  );
  assert.deepEqual(resolveRequestEntry(req({ isProxy: true })), {
    entry: null,
    consumed: false,
  });
});

test("크롤러가 보내면 끊는 쓰기는 행동 이벤트와 조회 기록뿐이다", () => {
  assert.equal(isAnalyticsWrite("POST", "/api/v1/events"), true);
  assert.equal(isAnalyticsWrite("POST", "/api/v1/articles/12/view"), true);
  /* 좋아요·댓글·게스트 발급은 끊지 않는다. 사람을 크롤러로 잘못 봐도 행동은 가야 한다 */
  assert.equal(isAnalyticsWrite("POST", "/api/v1/articles/12/like"), false);
  assert.equal(isAnalyticsWrite("POST", "/api/v1/articles/12/comments"), false);
  assert.equal(isAnalyticsWrite("DELETE", "/api/v1/articles/12/like"), false);
  assert.equal(isAnalyticsWrite("GET", "/api/v1/events"), false);
  assert.equal(
    isAnalyticsWrite("POST", "/api/v1/articles/12/view/extra"),
    false,
  );
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
  "Mozilla/5.0 (compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user)",
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

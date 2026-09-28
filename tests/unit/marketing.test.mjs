/**
 * @file `@plick/core/marketing` 회귀 테스트 (KAN-577). 광고 집계가 조용히 틀어지는 경계만 잡는다.
 */
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AUTH_HOSTS,
  marketingHeaders,
  parseMarketingCookie,
  readReferrerHost,
  resolveMarketing,
  resolveRequestMarketing,
  serializeMarketingCookie,
} from "../../packages/core/src/marketing.ts";

const q = (s) => new URLSearchParams(s);

const AD = {
  utmCampaign: "Opening-2026.09",
  utmMedium: "paid_social",
  utmContent: "reels-15s_A",
  referrer: "l.instagram.com",
  clickId: "IwAR0-AbC_123",
  clickSource: "meta",
};

test("광고 진입의 여섯 칸을 읽고 헤더로 편다", () => {
  const { marketing, touched } = resolveMarketing(
    {},
    q(
      "utm_campaign=Opening-2026.09&utm_medium=paid_social&utm_content=reels-15s_A&fbclid=IwAR0-AbC_123",
    ),
    "l.instagram.com",
  );
  assert.equal(touched, true);
  assert.deepEqual(marketing, AD);
  assert.deepEqual(marketingHeaders(marketing), {
    "X-Plick-Utm-Campaign": "Opening-2026.09",
    "X-Plick-Utm-Medium": "paid_social",
    "X-Plick-Utm-Content": "reels-15s_A",
    "X-Plick-Referrer": "l.instagram.com",
    "X-Plick-Click-Id": "IwAR0-AbC_123",
    "X-Plick-Click-Source": "meta",
  });
});

test("click_id는 대소문자를 보존하고 첫 파라미터의 출처를 붙인다", () => {
  const { marketing } = resolveMarketing(
    {},
    q("gclid=Cj0KCQjw-AbCdEf_GhI&ttclid=zz"),
    null,
  );
  assert.equal(marketing.clickId, "Cj0KCQjw-AbCdEf_GhI");
  assert.equal(marketing.clickSource, "google");
  assert.equal(
    resolveMarketing({}, q("ttclid=E.C.P.x"), null).marketing.clickSource,
    "tiktok",
  );
});

test("헤더에 못 싣는 값(한글, 공백, 상한 초과)은 칸을 뺀다", () => {
  const { marketing, touched } = resolveMarketing(
    AD,
    q(
      `utm_campaign=추석&utm_medium=paid social&utm_content=${"a".repeat(129)}`,
    ),
    null,
  );
  assert.equal(touched, true);
  assert.deepEqual(marketing, {});
  assert.doesNotThrow(() => new Headers(marketingHeaders(marketing)));
});

test("새 유입이면 덩어리를 통째로 갈고, 아니면 유지한다", () => {
  assert.deepEqual(resolveMarketing(AD, q(""), null), {
    marketing: AD,
    touched: false,
  });
  assert.deepEqual(resolveMarketing(AD, q("gclid=abc"), null).marketing, {
    clickId: "abc",
    clickSource: "google",
  });
  assert.deepEqual(resolveMarketing(AD, q("path=share"), null).marketing, {});
});

test("형식 밖 path는 새 유입으로 치지 않는다 (plick_path와 같은 기준)", () => {
  assert.equal(resolveMarketing(AD, q("path=../x"), null).touched, false);
  assert.equal(resolveMarketing(AD, q("utm_source=Insta"), null).touched, true);
});

test("자기 도메인·로그인 제공자·깨진 Referer는 외부 유입이 아니다", () => {
  for (const referer of [
    "https://kauth.kakao.com/oauth/authorize",
    "https://accounts.kakao.com/login",
    "https://accounts.google.com/",
    "https://appleid.apple.com/auth",
    "https://plick.co.kr/reels",
    "https://m.plick.co.kr/",
    "http://localhost:3001/",
    "not a url",
    null,
  ]) {
    assert.equal(readReferrerHost(referer, "localhost"), null, referer);
  }
  assert.equal(
    readReferrerHost("https://www.Google.com/search?q=secret", "m.plick.co.kr"),
    "www.google.com",
  );
});

test("쿠키 왕복이 되고, 고친 쿠키의 형식 밖 칸은 버린다", () => {
  assert.deepEqual(parseMarketingCookie(serializeMarketingCookie(AD)), AD);
  assert.deepEqual(parseMarketingCookie("c=%EC%B6%94&i=ok"), {});
  assert.deepEqual(parseMarketingCookie(undefined), {});
});

test("프록시 조립: /be는 쿠키만, 빈 덩어리는 지우기, 크롤러는 안 심는다", () => {
  const cookie = serializeMarketingCookie(AD);
  const base = {
    cookie,
    searchParams: q("gclid=abc"),
    referer: null,
    ownHost: "m.plick.co.kr",
    isProxy: false,
    isCrawler: false,
  };
  assert.deepEqual(resolveRequestMarketing({ ...base, isProxy: true }), {
    marketing: AD,
    cookie: null,
  });
  assert.equal(resolveRequestMarketing(base).cookie, "i=abc&s=google");
  assert.equal(
    resolveRequestMarketing({ ...base, searchParams: q("path=share") }).cookie,
    "",
  );
  assert.equal(
    resolveRequestMarketing({ ...base, isCrawler: true }).cookie,
    null,
  );
  assert.equal(
    resolveRequestMarketing({ ...base, searchParams: q("") }).cookie,
    null,
  );
});

test("길이 상한 경계와 클릭 식별자 쌍 규칙", () => {
  const at = (params) => resolveMarketing({}, q(params), null).marketing;
  assert.equal(at(`utm_campaign=${"a".repeat(64)}`).utmCampaign?.length, 64);
  assert.equal(at(`utm_campaign=${"a".repeat(65)}`).utmCampaign, undefined);
  assert.equal(at(`fbclid=${"A".repeat(128)}`).clickId?.length, 128);
  assert.equal(at(`fbclid=${"A".repeat(129)}`).clickId, undefined);
  assert.deepEqual(parseMarketingCookie("i=abc"), {});
  assert.deepEqual(parseMarketingCookie("i=abc&s=META"), {});
});

test("소셜 로그인 authorize 호스트가 전부 유입 제외 목록에 있다", () => {
  for (const app of ["mobile", "web"]) {
    const source = readFileSync(
      new URL(`../../apps/${app}/app/_constants/api.ts`, import.meta.url),
      "utf8",
    );
    const hosts = [...source.matchAll(/endpoint: "https:\/\/([^/"]+)/g)].map(
      (m) => m[1],
    );
    assert.ok(hosts.length >= 3, `${app} OAuth endpoint를 못 찾았다`);
    for (const host of hosts) {
      assert.ok(
        AUTH_HOSTS.includes(host),
        `${app}: ${host}가 AUTH_HOSTS에 없다`,
      );
    }
  }
});

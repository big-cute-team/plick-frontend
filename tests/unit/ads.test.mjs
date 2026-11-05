/**
 * @file `@plick/core/ads` 회귀 테스트 (KAN-652). 릴스 전면광고 끼워 넣기와 순번 환산,
 * 앱 셸 끄기, ads.txt 한 줄, 앱 셸에서 광고 요청을 멈추는 head 스크립트(KAN-632),
 * 단위 번호 없는 live에서 자리와 릴스 슬라이드를 함께 접는 판정(KAN-730).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ADSENSE_CLIENT,
  adsPauseScript,
  adsTxt,
  interleaveReelAds,
  isAdUnitDrawn,
  isAdsMode,
  REELS_AD_INTERVAL,
  reelAdInterval,
  reelIndexAt,
  resolveAdsMode,
} from "../../packages/core/src/ads.ts";

const reels = (n) => Array.from({ length: n }, (_, i) => `r${i}`);

test("8장마다 광고가 릴 사이에만 들어간다", () => {
  const slides = interleaveReelAds(reels(17), 8);
  const kinds = slides.map((s) => (s.kind === "ad" ? "A" : "r")).join("");
  assert.equal(kinds, "rrrrrrrrArrrrrrrrAr");
  assert.deepEqual(
    slides.filter((s) => s.kind === "ad").map((s) => s.id),
    ["ad-1", "ad-2"],
  );
});

test("정확히 8장이면 끝에 광고가 붙지 않는다", () => {
  const slides = interleaveReelAds(reels(8), 8);
  assert.equal(slides.length, 8);
  assert.ok(slides.every((s) => s.kind === "reel"));
});

test("릴 슬라이드의 reelIndex는 릴 배열 순번이다", () => {
  const slides = interleaveReelAds(reels(10), 8);
  const ninth = slides[9];
  assert.equal(ninth.kind, "reel");
  assert.equal(ninth.reelIndex, 8);
  assert.equal(ninth.reel, "r8");
});

test("interval이 null이면 광고 없이 감싼다", () => {
  const slides = interleaveReelAds(reels(20), null);
  assert.equal(slides.length, 20);
  assert.ok(slides.every((s) => s.kind === "reel"));
});

test("reelIndexAt은 광고 슬라이드에서 바로 앞 릴 순번을 준다", () => {
  const slides = interleaveReelAds(reels(10), 8);
  assert.equal(reelIndexAt(slides, 0), 0);
  assert.equal(reelIndexAt(slides, 7), 7);
  assert.equal(reelIndexAt(slides, 8), 7); // 광고
  assert.equal(reelIndexAt(slides, 9), 8);
  assert.equal(reelIndexAt(slides, 99), 9); // 범위 밖은 마지막 릴
  assert.equal(reelIndexAt([], 0), 0);
});

test("앱 셸이면 off, 그 밖은 기본 모드", () => {
  assert.equal(resolveAdsMode("live", "plick_app"), "off");
  assert.equal(resolveAdsMode("live", "browser"), "live");
  assert.equal(resolveAdsMode("placeholder", null), "placeholder");
  assert.equal(resolveAdsMode("placeholder", undefined), "placeholder");
});

test("광고 상자는 placeholder거나 live에 단위 번호가 있을 때만 그린다", () => {
  assert.equal(isAdUnitDrawn("off", "123"), false);
  assert.equal(isAdUnitDrawn("placeholder", ""), true);
  assert.equal(isAdUnitDrawn("placeholder", "123"), true);
  assert.equal(isAdUnitDrawn("live", ""), false);
  assert.equal(isAdUnitDrawn("live", "123"), true);
});

test("릴스 광고 간격은 상자를 그릴 수 있을 때만 8이고 아니면 null이다", () => {
  assert.equal(reelAdInterval("placeholder", ""), REELS_AD_INTERVAL);
  assert.equal(reelAdInterval("live", "123"), REELS_AD_INTERVAL);
  /* prod 승인 전: live인데 단위 번호가 비어 있다. 빈 전면광고 슬라이드가 끼면 안 된다 */
  assert.equal(reelAdInterval("live", ""), null);
  assert.equal(reelAdInterval("off", "123"), null);
  const slides = interleaveReelAds(reels(20), reelAdInterval("live", ""));
  assert.ok(slides.every((s) => s.kind === "reel"));
});

test("isAdsMode는 세 값만 통과시킨다", () => {
  assert.ok(isAdsMode("live"));
  assert.ok(isAdsMode("placeholder"));
  assert.ok(isAdsMode("off"));
  assert.equal(isAdsMode(""), false);
  assert.equal(isAdsMode(undefined), false);
  assert.equal(isAdsMode("on"), false);
});

test("ads.txt는 게시자 ID에서 ca- 접두어를 뗀 한 줄이다", () => {
  assert.equal(ADSENSE_CLIENT, "ca-pub-1989769587706531");
  assert.equal(
    adsTxt(),
    "google.com, pub-1989769587706531, DIRECT, f08c47fec0942fa0\n",
  );
});

test("앱 셸 UA에서만 pauseAdRequests를 세우는 head 스크립트", () => {
  const script = adsPauseScript();
  const run = (userAgent) => {
    const window = {};
    new Function("navigator", "window", script)({ userAgent }, window);
    return window.adsbygoogle?.pauseAdRequests ?? null;
  };
  assert.equal(
    run(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 PlickApp/1.2",
    ),
    1,
  );
  assert.equal(
    run(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
    ),
    null,
  );
  assert.equal(
    run("Mozilla/5.0 (Linux; Android 14) Instagram 320.0.0.0.0 Android"),
    null,
  );
});

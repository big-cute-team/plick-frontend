/**
 * @file `@plick/core/ads` 회귀 테스트 (KAN-652). 릴스 전면광고 끼워 넣기와 순번 환산,
 * 앱 셸 끄기, ads.txt 한 줄, 앱 셸에서 광고 요청을 멈추는 head 스크립트(KAN-632).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ADSENSE_CLIENT,
  adNetworkFor,
  adfitSize,
  adsPauseScript,
  adsTxt,
  interleaveReelAds,
  isAdsMode,
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

test("애드핏 크기는 높이가 있어야 나오고 폭이 비면 배너 폭을 쓴다 (KAN-652)", () => {
  assert.deepEqual(adfitSize({ height: 90 }, 728), { width: 728, height: 90 });
  assert.deepEqual(adfitSize({ width: 300, height: 250 }, 320), {
    width: 300,
    height: 250,
  });
  assert.equal(adfitSize({}, 320), null);
});

test("광고망은 애드핏 ID가 먼저고 둘 다 비면 자리를 안 그린다 (KAN-652)", () => {
  assert.equal(adNetworkFor({ slot: "123", adfit: "DAN-1" }), "adfit");
  assert.equal(adNetworkFor({ slot: "123", adfit: "" }), "adsense");
  assert.equal(adNetworkFor({ slot: "", adfit: "" }), null);
});

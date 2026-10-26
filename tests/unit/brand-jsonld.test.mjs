/**
 * @file 리브랜딩 SEO 회귀 테스트 (KAN-633). 사이트명 JSON-LD가 옛 이름을 alternateName으로 잇는지,
 * 루트 title이 바뀌지 않았는지.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BRAND_NAME_KO,
  BRAND_SUMMARY,
  BRAND_TITLE,
} from "../../packages/domain/src/brand.ts";
import {
  organizationJsonLd,
  webSiteJsonLd,
} from "../../packages/domain/src/jsonld.ts";

const SITE = "https://plick.co.kr";

test("WebSite·Organization alternateName에 영문명과 옛 이름이 있다", () => {
  const expected = ["Haechukimo", "플릭", "PLick"];
  assert.deepEqual(webSiteJsonLd({ siteUrl: SITE }).alternateName, expected);
  assert.deepEqual(
    organizationJsonLd({ siteUrl: SITE, logoUrl: `${SITE}/icon.png` })
      .alternateName,
    expected,
  );
});

test("대표 사이트명은 해축이모 그대로다", () => {
  assert.equal(webSiteJsonLd({ siteUrl: SITE }).name, "해축이모");
  assert.equal(BRAND_NAME_KO, "해축이모");
});

test("루트 title과 manifest 요약은 같은 문구에서 나온다", () => {
  assert.equal(BRAND_SUMMARY, "해외축구 이적 루머와 이슈 모음");
  assert.equal(BRAND_TITLE, "해축이모 / 해외축구 이적 루머와 이슈 모음");
});

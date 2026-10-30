/**
 * @file 운영자가 쓴 글(소개·가이드·팀 소개) 회귀 테스트 (KAN-652). 애드센스 "가치가 별로 없는
 * 콘텐츠" 대응으로 둔 글이라 분량이 줄거나 자동 생성을 자백하는 문구가 되돌아오면 잡는다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ABOUT_DESCRIPTION,
  ABOUT_SECTIONS,
  CONTACT_EMAIL,
} from "../../packages/domain/src/about.ts";
import {
  BRAND_DESCRIPTION,
  homeIntroCopy,
} from "../../packages/domain/src/brand.ts";
import { TEAM_ORDER } from "../../packages/domain/src/constants.ts";
import { FAQ_ITEMS } from "../../packages/domain/src/faq.ts";
import { GUIDES, GUIDE_ORDER } from "../../packages/domain/src/guides.ts";
import { proseText } from "../../packages/domain/src/prose.ts";
import { TEAM_INTROS } from "../../packages/domain/src/team-intro.ts";

test("소개와 가이드는 각각 1,000자를 넘는다", () => {
  assert.ok(proseText(ABOUT_SECTIONS).length > 1000);
  for (const slug of GUIDE_ORDER) {
    assert.ok(proseText(GUIDES[slug].sections).length > 1000, slug);
    assert.equal(GUIDES[slug].slug, slug);
    assert.match(GUIDES[slug].updatedAt, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test("팀 소개는 여섯 팀 모두 500자를 넘고 절이 셋이다", () => {
  for (const code of TEAM_ORDER) {
    const intro = TEAM_INTROS[code];
    assert.ok(proseText(intro.sections).length > 500, code);
    assert.equal(intro.sections.length, 3, code);
  }
});

test("description은 네이버 권장 80자 이내다", () => {
  assert.ok(BRAND_DESCRIPTION.length <= 80);
  assert.ok(ABOUT_DESCRIPTION.length <= 80);
  for (const slug of GUIDE_ORDER) {
    assert.ok(GUIDES[slug].description.length <= 80, slug);
  }
});

test("자동 생성을 자백하는 문구가 브랜드 문안에 없다", () => {
  for (const text of [
    BRAND_DESCRIPTION,
    homeIntroCopy(),
    homeIntroCopy("리버풀 FC"),
  ]) {
    assert.doesNotMatch(text, /AI가|번역/);
  }
});

test("소개 글은 소식 요약이 자동이라는 사실을 밝힌다", () => {
  assert.match(proseText(ABOUT_SECTIONS), /자동 번역과 요약\(AI 보조\)/);
});

test("문의 이메일은 FAQ와 소개가 같은 값이다", () => {
  const contact = FAQ_ITEMS.find((item) => item.question.includes("문의"));
  assert.ok(contact);
  assert.ok(
    contact.answer.some(
      (segment) =>
        typeof segment === "string" && segment.includes(CONTACT_EMAIL),
    ),
  );
  assert.ok(proseText(ABOUT_SECTIONS).includes(CONTACT_EMAIL));
});

test("FAQ 링크는 실제로 있는 가이드·소개 경로만 가리킨다", () => {
  const known = new Set([
    "/about",
    "/privacy",
    ...GUIDE_ORDER.map((slug) => `/guide/${slug}`),
  ]);
  for (const item of FAQ_ITEMS) {
    for (const segment of item.answer) {
      if (typeof segment !== "string")
        assert.ok(known.has(segment.href), segment.href);
    }
  }
});

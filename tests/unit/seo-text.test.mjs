/**
 * @file FAQPage JSON-LD와 llms.txt 빌더 회귀 테스트 (KAN-623). 화면 문안(`FAQ_ITEMS`)이
 * 구조화 데이터와 안내문에 평문으로 그대로 들어가는지, 링크 조각이 글자만 남기는지 본다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FAQ_ITEMS, faqAnswerText } from "../../packages/domain/src/faq.ts";
import { faqPageJsonLd } from "../../packages/domain/src/jsonld.ts";
import { llmsTxt } from "../../packages/domain/src/llms.ts";

test("링크 조각은 글자만 남기고 이어 붙인다", () => {
  const withdraw = FAQ_ITEMS.find((item) => item.question.includes("탈퇴"));
  assert.ok(withdraw);
  const text = faqAnswerText(withdraw);
  assert.match(text, /자세한 내용은 개인정보처리방침을 확인해 주세요\.$/);
  assert.doesNotMatch(text, /href|</);
});

test("FAQPage는 항목마다 Question·Answer를 평문으로 낸다", () => {
  const data = faqPageJsonLd({ url: "https://plick.co.kr/faq" });
  assert.equal(data["@type"], "FAQPage");
  assert.equal(data.url, "https://plick.co.kr/faq");
  assert.equal(data.mainEntity.length, FAQ_ITEMS.length);
  for (const [index, entity] of data.mainEntity.entries()) {
    assert.equal(entity["@type"], "Question");
    assert.equal(entity.name, FAQ_ITEMS[index].question);
    assert.equal(entity.acceptedAnswer["@type"], "Answer");
    assert.equal(typeof entity.acceptedAnswer.text, "string");
    assert.ok(entity.acceptedAnswer.text.length > 0);
  }
});

test("llms.txt는 브랜드, 팀 허브 6개, FAQ, 안내 페이지를 호스트 URL로 싣는다", () => {
  const text = llmsTxt({ siteUrl: "https://plick.co.kr" });
  assert.match(text, /^# 해축이모 \(Haechukimo\)/);
  assert.equal(
    (text.match(/https:\/\/plick\.co\.kr\/teams\/[a-z-]+\)/g) ?? []).length,
    6,
  );
  assert.match(text, /이 도메인이 canonical이다/);
  for (const item of FAQ_ITEMS) assert.ok(text.includes(item.question));
  for (const path of [
    "/about",
    "/guide/rumour-stages",
    "/guide/transfer-terms",
    "/faq",
    "/terms",
    "/privacy",
  ]) {
    assert.ok(text.includes(`https://plick.co.kr${path}`), path);
  }
  // 기사는 noindex라 사이트맵 링크로 전건을 안내하지 않는다 (KAN-652)
  assert.doesNotMatch(text, /sitemap\.xml/);
});

test("모바일 llms.txt는 자기 URL을 쓰고 canonical이 데스크톱임을 적는다", () => {
  const text = llmsTxt({
    siteUrl: "https://m.plick.co.kr",
    canonicalSiteUrl: "https://plick.co.kr",
  });
  assert.match(text, /\(https:\/\/m\.plick\.co\.kr\/teams\/liverpool\)/);
  assert.match(text, /canonical은 데스크톱 https:\/\/plick\.co\.kr/);
});

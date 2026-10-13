/**
 * @file `htmlLimitedBots` 목록 회귀 테스트 (KAN-623). 설정이 Next 기본 목록을 대체하므로
 * 기본 목록의 봇을 하나라도 빠뜨리면 그 봇이 메타를 body에서 받게 된다. 설치된 Next의
 * 기본 패턴과 대조하고, 덧붙인 봇이 실제로 매치되는지 본다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { HTML_LIMITED_BOTS } from "../../packages/core/src/html-limited-bots.mjs";
import { HTML_LIMITED_BOT_UA_RE } from "../../apps/web/node_modules/next/dist/shared/lib/router/utils/html-bots.js";

test("Next 기본 목록의 토큰을 전부 포함한다", () => {
  const defaults = HTML_LIMITED_BOT_UA_RE.source.split("|");
  const ours = HTML_LIMITED_BOTS.source.split("|");
  for (const token of defaults) {
    assert.ok(
      ours.includes(token),
      `Next 기본 봇 토큰이 빠졌다: ${token} — html-limited-bots.mjs의 NEXT_DEFAULT_BOTS를 설치된 Next에 맞춘다`,
    );
  }
});

test("Next 기본 목록이 잡는 UA는 우리 목록도 잡는다", () => {
  const samples = [
    "Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)",
    "facebookexternalhit/1.1",
    "Twitterbot/1.0",
    "TelegramBot (like TwitterBot)",
    "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
    "Mediapartners-Google",
    "Google-InspectionTool/1.0",
    "Chrome-Lighthouse",
  ];
  for (const ua of samples) {
    assert.ok(
      HTML_LIMITED_BOT_UA_RE.test(ua),
      `Next 기본이 안 잡는 샘플: ${ua}`,
    );
    assert.ok(HTML_LIMITED_BOTS.test(ua), `우리 목록이 놓친다: ${ua}`);
  }
});

test("덧붙인 메신저 미리보기와 AI 크롤러를 잡는다", () => {
  const added = [
    "kakaotalk-scrap/1.0",
    "Mozilla/5.0 (compatible; Daum/4.1; +http://cs.daum.net/faq/15/4118.html?faqId=28966)",
    "Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)",
    "Mozilla/5.0 (compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)",
    "Mozilla/5.0 AppleWebKit/537.36 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
    "Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)",
    "CCBot/2.0 (https://commoncrawl.org/faq/)",
    "Mozilla/5.0 (compatible; Bytespider; spider-feedback@bytedance.com)",
    "Mozilla/5.0 (compatible; Amazonbot/0.1; +https://developer.amazon.com/support/amazonbot)",
    "meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)",
  ];
  for (const ua of added) {
    assert.ok(
      !HTML_LIMITED_BOT_UA_RE.test(ua),
      `Next 기본이 이미 잡는다(덧붙일 필요 없음): ${ua}`,
    );
    assert.ok(HTML_LIMITED_BOTS.test(ua), `덧붙인 봇을 놓친다: ${ua}`);
  }
});

test("브라우저와 Googlebot은 그대로 스트리밍한다", () => {
  const streaming = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  ];
  for (const ua of streaming) {
    assert.ok(
      !HTML_LIMITED_BOTS.test(ua),
      `브라우저·Googlebot을 봇으로 잡는다: ${ua}`,
    );
  }
});

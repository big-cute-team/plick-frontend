/**
 * @file 메타데이터를 스트리밍하지 않고 `<head>`에 넣어 줘야 하는 봇 UA 목록 (KAN-623, KAN-641).
 *
 * Next 15.2부터 `generateMetadata`가 비동기인 라우트는 메타 태그(title, description,
 * canonical, og:*)를 `<head>`가 아니라 `<body>` 끝으로 흘려보낸다(스트리밍 메타데이터).
 * 브라우저와 JS를 실행하는 Googlebot은 DOM에 반영된 뒤 읽으니 문제가 없지만, HTML을
 * 한 번 받아 `<head>`만 파싱하는 봇은 description과 og:image를 놓친다. Next는
 * `htmlLimitedBots`에 맞는 UA에만 메타데이터를 기다려 head에 넣어 준다.
 *
 * 이 값을 설정하면 Next 기본 목록을 대체한다(합치지 않는다, `server/config.js`). 그래서
 * 기본 목록을 그대로 복사한 뒤 우리 트래픽에 중요한 봇을 덧붙인다. 기본 목록이 Next
 * 버전에 따라 늘어날 수 있어 `tests/unit/html-limited-bots.test.mjs`가 설치된 Next의
 * 기본 패턴과 대조한다.
 *
 * `next.config.js`가 빌드 시점에 import하는 파일이라 TS가 아니라 `.mjs`다.
 */

/** Next 16.2 기본 목록 (`next/dist/shared/lib/router/utils/html-bots.js`) */
const NEXT_DEFAULT_BOTS = [
  "[\\w-]+-Google",
  "Google-[\\w-]+",
  "Chrome-Lighthouse",
  "Slurp",
  "DuckDuckBot",
  "baiduspider",
  "yandex",
  "sogou",
  "bitlybot",
  "tumblr",
  "vkShare",
  "quora link preview",
  "redditbot",
  "ia_archiver",
  "Bingbot",
  "BingPreview",
  "applebot",
  "facebookexternalhit",
  "facebookcatalog",
  "Twitterbot",
  "LinkedInBot",
  "Slackbot",
  "Discordbot",
  "WhatsApp",
  "SkypeUriPreview",
  "Yeti",
  "googleweblight",
];

/**
 * 덧붙이는 봇. 국내 메신저 미리보기(카카오톡, 다음, 라인. 텔레그램은 UA에 TwitterBot을
 * 달아 기본 목록에 걸린다)와 JS를 실행하지 않는 AI 검색 크롤러(OpenAI, Anthropic,
 * Perplexity, Common Crawl, 바이트댄스, 아마존, 메타)다. 실측(2026-10-13)에서
 * `kakaotalk-scrap`은 기사 상세의 og:image를 body에서 받았다. AI 크롤러는 llms.txt보다
 * 이쪽이 노출에 직접 닿는다.
 */
const EXTRA_BOTS = [
  "kakaotalk-scrap",
  "Daum",
  "Line/",
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-Web",
  "Claude-User",
  "Claude-SearchBot",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "CCBot",
  "Bytespider",
  "Amazonbot",
  "meta-externalagent",
  "meta-externalfetcher",
];

/** `next.config.js`의 `htmlLimitedBots`에 그대로 넘기는 정규식 */
export const HTML_LIMITED_BOTS = new RegExp(
  [...NEXT_DEFAULT_BOTS, ...EXTRA_BOTS].join("|"),
  "i",
);

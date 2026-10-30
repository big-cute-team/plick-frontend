/**
 * @file `/llms.txt` 본문 빌더 (KAN-623) — web·mobile 공용.
 *
 * llms.txt는 AI 검색·어시스턴트가 사이트를 요약해 갈 때 읽으라고 두는 마크다운
 * 안내문이다(llmstxt.org 제안). 구글 검색은 읽지 않는다. 기대치는 낮게 두되, 비용이
 * 라우트 하나라 둔다. 실제 노출에 더 닿는 건 `htmlLimitedBots`에 AI 크롤러를 넣어
 * 메타와 JSON-LD를 head에서 받게 하는 쪽이다(`@plick/core/html-limited-bots`).
 *
 * 두 도메인이 같은 콘텐츠라 본문도 같은 틀이고 절대 URL만 호스트별로 다르다.
 * canonical은 데스크톱이라는 사실을 본문에 적어 둔다.
 */
import { BRAND_DESCRIPTION, BRAND_NAME_EN, BRAND_NAME_KO } from "./brand";
import { TEAMS, TEAM_ORDER } from "./constants";
import { FAQ_ITEMS, faqAnswerText } from "./faq";
import { GUIDES, GUIDE_ORDER } from "./guides";

/**
 * llms.txt 본문을 만든다.
 *
 * @param siteUrl 이 호스트의 절대 URL (예: https://plick.co.kr)
 * @param canonicalSiteUrl canonical 도메인 절대 URL (데스크톱). 같은 호스트면 생략
 */
export function llmsTxt({
  siteUrl,
  canonicalSiteUrl = siteUrl,
}: {
  siteUrl: string;
  canonicalSiteUrl?: string;
}): string {
  const teams = TEAM_ORDER.map(
    (code) =>
      `- [${TEAMS[code].name} 이적 루머](${siteUrl}/teams/${TEAMS[code].slug}): ${TEAMS[code].name} 관련 기사와 루머 모음`,
  );
  const faq = FAQ_ITEMS.map(
    (item) => `- ${item.question} ${faqAnswerText(item)}`,
  );
  const guides = GUIDE_ORDER.map(
    (slug) =>
      `- [${GUIDES[slug].title}](${siteUrl}/guide/${slug}): ${GUIDES[slug].description}`,
  );
  const canonicalNote =
    canonicalSiteUrl === siteUrl
      ? `이 도메인이 canonical이다. 모바일 웹은 m. 서브도메인에 같은 경로로 있다.`
      : `이 도메인은 모바일 웹이다. canonical은 데스크톱 ${canonicalSiteUrl} 이고 경로는 같다.`;

  return [
    `# ${BRAND_NAME_KO} (${BRAND_NAME_EN})`,
    "",
    `> ${BRAND_DESCRIPTION}`,
    "",
    "콘텐츠 언어는 한국어다. 해외 축구 기자들이 X(옛 트위터)에 올린 게시물을 원문 링크와 기자 이름을 붙여 싣고, 구단이나 선수의 공식 발표 전 루머는 확정이 아니라고 표시한다.",
    canonicalNote,
    "",
    "## 주요 페이지",
    "",
    `- [홈](${siteUrl}/): 최신 프리미어리그 이적 루머와 이슈`,
    `- [릴스](${siteUrl}/reels): 소식을 세로로 넘겨보는 피드`,
    `- [투표](${siteUrl}/debates): 이적 이슈 찬반 투표`,
    `- [라이브 스코어](${siteUrl}/live): 빅6 경기 일정과 스코어`,
    "",
    "## 팀 허브",
    "",
    ...teams,
    "",
    "## 운영자가 쓴 글",
    "",
    `- [해축이모 소개](${siteUrl}/about): 수집 방식, 콘텐츠 원칙, 운영자와 문의처`,
    ...guides,
    "",
    "## 기사",
    "",
    `- 기사 상세는 \`${siteUrl}/articles/{id}\`, 같은 기사의 릴 보기는 \`${siteUrl}/reels/{id}\` 다. 본문은 원문 게시물의 요약이라 색인 대상이 아니고(noindex) 사이트맵에도 없다.`,
    "",
    "## 자주 묻는 질문",
    "",
    ...faq,
    "",
    "## 안내",
    "",
    `- [FAQ](${siteUrl}/faq)`,
    `- [이용약관](${siteUrl}/terms)`,
    `- [개인정보처리방침](${siteUrl}/privacy)`,
    "",
  ].join("\n");
}

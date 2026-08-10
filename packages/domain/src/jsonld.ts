/**
 * @file JSON-LD(schema.org 구조화 데이터) 빌더 — web·mobile 공용 (KAN-351).
 *
 * 같은 콘텐츠가 두 도메인(plick.co.kr, m.plick.co.kr)에 있으므로 구조화 데이터도
 * 두 앱이 같은 값을 내야 한다(구글 별도 모바일 URL 가이드). 그래서 빌더를 여기
 * 단일 출처로 두고, 앱마다 다른 절대 URL만 인자로 받는다. 모바일도 canonical
 * 도메인(plick.co.kr) 기준 URL을 넘겨 시그널을 한 도메인에 모은다.
 *
 * 렌더는 `@plick/ui` JsonLd 컴포넌트가 맡는다.
 */
import { BRAND_DESCRIPTION, BRAND_NAME_EN, BRAND_NAME_KO } from "./brand";
import type { ArticleCard, ArticleDetail } from "./types";

/** Organization 노드의 안정 식별자 — 페이지끼리 같은 발행 주체를 가리키게 한다 */
function organizationId(siteUrl: string): string {
  return `${siteUrl}/#organization`;
}

/**
 * 서비스 발행 주체 Organization — 홈에 싣는다. "plick"·"플릭" 브랜드 검색의
 * 지식 패널 후보가 되는 노드다(SEO 전략 G2).
 *
 * @param siteUrl canonical 도메인 절대 URL (예: https://plick.co.kr)
 * @param logoUrl 로고 이미지 절대 URL (앱 아이콘 `/icon.png`)
 */
export function organizationJsonLd({
  siteUrl,
  logoUrl,
}: {
  siteUrl: string;
  logoUrl: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": organizationId(siteUrl),
    name: BRAND_NAME_KO,
    alternateName: BRAND_NAME_EN,
    url: siteUrl,
    description: BRAND_DESCRIPTION,
    logo: { "@type": "ImageObject", url: logoUrl },
  };
}

/**
 * 사이트 자체를 선언하는 WebSite — 홈에 Organization과 나란히 싣는다.
 * 검색 결과 상단의 사이트명 표기를 정하는 노드다 (KAN-384) — 구글 사이트명
 * 문서가 이 name을 1순위 소스로 쓴다. 한글 "플릭"을 대표명으로, 영문
 * "PLick"을 alternateName으로 둬 두 표기 검색을 다 받는다.
 *
 * @param siteUrl canonical 도메인 절대 URL
 */
export function webSiteJsonLd({
  siteUrl,
}: {
  siteUrl: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name: BRAND_NAME_KO,
    alternateName: BRAND_NAME_EN,
    url: siteUrl,
    inLanguage: "ko",
    publisher: { "@id": organizationId(siteUrl) },
  };
}

/**
 * 기사 상세의 NewsArticle — 기사 하나하나가 롱테일 검색의 랜딩이라 리치 결과
 * 자격을 여기서 얻는다(SEO 전략 Step 2-3).
 *
 * author는 기사에 실린 기자 전원을 Person으로 싣고(KAN-365 전에는 대표 한 명),
 * 기자가 없는 기사는 서비스(Organization)를 저자로 둔다. publisher는 참조(`@id`)가 아니라 인라인 Organization이다 — 기사
 * 페이지에는 홈의 Organization 노드가 없어서 참조가 닿지 않는다.
 *
 * @param article 기사 상세
 * @param canonicalUrl 이 기사의 canonical 절대 URL (데스크톱 기사 URL)
 * @param imageUrl 동적 OG 이미지 절대 URL
 * @param siteUrl canonical 도메인 절대 URL
 * @param logoUrl publisher 로고 절대 URL
 */
export function newsArticleJsonLd({
  article,
  canonicalUrl,
  imageUrl,
  siteUrl,
  logoUrl,
}: {
  article: ArticleDetail;
  canonicalUrl: string;
  imageUrl: string;
  siteUrl: string;
  logoUrl: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.summary,
    image: [imageUrl],
    datePublished: article.publishedAt,
    inLanguage: "ko",
    mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
    author:
      article.reporters.length > 0
        ? article.reporters.map((reporter) => ({
            "@type": "Person",
            name: reporter.name,
          }))
        : [{ "@type": "Organization", name: BRAND_NAME_KO, url: siteUrl }],
    publisher: {
      "@type": "Organization",
      "@id": organizationId(siteUrl),
      name: BRAND_NAME_KO,
      logo: { "@type": "ImageObject", url: logoUrl },
    },
  };
}

/**
 * 팀 허브의 CollectionPage + ItemList — "토트넘 이적 루머" 같은 팀 검색어
 * 랜딩이 기사 모음 페이지임을 선언한다(SEO 전략 Step 2-3).
 *
 * 목록은 서버 렌더된 첫 페이지만 싣는다 — 크롤러가 보는 초기 HTML과 같은
 * 범위다. 피드 로드가 실패해 목록이 비면 ItemList 없이 페이지 선언만 남긴다.
 *
 * @param teamFullName 팀 정식 명칭 (예: 토트넘 핫스퍼)
 * @param url 팀 허브 canonical 절대 URL
 * @param siteUrl canonical 도메인 절대 URL — 기사 항목 URL 조립에 쓴다
 * @param articles 서버 렌더된 첫 페이지 기사 목록
 */
export function teamCollectionJsonLd({
  teamFullName,
  url,
  siteUrl,
  articles,
}: {
  teamFullName: string;
  url: string;
  siteUrl: string;
  articles: ArticleCard[];
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${teamFullName} 이적 루머`,
    url,
    inLanguage: "ko",
    ...(articles.length > 0 && {
      mainEntity: {
        "@type": "ItemList",
        itemListElement: articles.map((article, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: article.title,
          url: `${siteUrl}/articles/${article.id}`,
        })),
      },
    }),
  };
}

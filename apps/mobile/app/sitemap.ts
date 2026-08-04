import type { MetadataRoute } from "next";
import { ARTICLES_MAX_PAGE_SIZE, getArticles } from "@plick/core/articles";
import { TEAMS, TEAM_ORDER } from "@plick/domain/constants";
import { SITE_URL } from "@/_constants/site";

/**
 * 빌드 시점이 아니라 요청 시점에 생성한다. 기본값(정적)이면 `next build`가
 * CI 러너에서 BE를 불러 실패하고, 성공해도 기사 목록이 빌드 시점으로 굳는다.
 * 크롤러가 가끔 받아 가는 파일이라 요청마다 BE를 도는 비용은 무시할 수준이다.
 */
export const dynamic = "force-dynamic";

/**
 * 색인 안전 상한. 사이트맵 규격 한도(50,000 URL)에 닿기 전에 끊는다 —
 * 여기 걸릴 만큼 기사가 쌓이면 사이트맵 인덱스 분할이 선행 과제다(전략 문서 Step 1-2).
 */
const MAX_ARTICLE_URLS = 5000;

/**
 * 사이트맵 (KAN-346). `/sitemap.xml`로 컴파일된다.
 *
 * 정적 라우트에 BE 기사 전건(`/articles/{id}`)을 커서 페이징으로 이어 붙인다.
 * lastModified는 발행 시각이다. BE가 죽어 있으면 기사 없이 정적 라우트만
 * 내려보낸다 — 사이트맵이 500이면 크롤러가 사이트 전체를 의심하므로 실패를
 * 삼키고 부분 응답을 준다.
 *
 * 로그인·마이·온보딩은 robots에서 막거나 색인 가치가 없어 싣지 않는다.
 * 릴스 피드(`/reels`)는 색인 담당이 아니라 탐색 진입점이지만(전략 문서 리스크 4)
 * 존재 자체는 알리도록 싣는다.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/reels`, changeFrequency: "daily", priority: 0.6 },
    // 팀 허브 (KAN-350) — 팀 검색어의 랜딩이라 기사 개별 페이지보다 우선순위를 높인다
    ...TEAM_ORDER.map((code) => ({
      url: `${SITE_URL}/teams/${TEAMS[code].slug}`,
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
  ];

  try {
    let cursor: string | null = null;
    let count = 0;
    do {
      const page = await getArticles({
        size: ARTICLES_MAX_PAGE_SIZE,
        cursor,
      });
      for (const article of page.items) {
        entries.push({
          url: `${SITE_URL}/articles/${article.id}`,
          lastModified: new Date(article.publishedAt),
          priority: 0.8,
        });
      }
      count += page.items.length;
      cursor = page.nextCursor;
    } while (cursor && count < MAX_ARTICLE_URLS);
  } catch (error) {
    console.error("[sitemap] 기사 목록 로드 실패 — 정적 라우트만 응답:", error);
  }

  return entries;
}

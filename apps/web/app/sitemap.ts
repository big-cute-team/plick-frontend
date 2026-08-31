import type { MetadataRoute } from "next";
import { ARTICLES_MAX_PAGE_SIZE, getArticles } from "@plick/core/articles";
import { TEAMS, TEAM_ORDER } from "@plick/domain/constants";
import { SITE_URL } from "@/_constants/site";

/**
 * 빌드 시점이 아니라 요청 시점에 생성한다. 기본값(정적)이면 `next build`가
 * CI 러너에서 BE를 불러 실패하고, 성공해도 기사 목록이 빌드 시점으로 굳는다.
 * 크롤러가 가끔 받아 가는 파일이라 요청마다 BE를 도는 비용은 무시할 수준이다.
 *
 * 렌더는 요청마다지만 그 안의 기사 목록 fetch는 데이터 캐시를 탄다 (KAN-380).
 * `force-dynamic`은 fetch 옵션을 명시하지 않은 호출만 no-store로 낮추는데,
 * `apiFetch`가 익명 GET에 revalidate를 명시하므로 여기서도 캐시가 산다.
 */
export const dynamic = "force-dynamic";

/**
 * 색인 안전 상한. 사이트맵 규격 한도(파일당 50,000 URL)에 정적 라우트 몫을 빼고
 * 여유를 둔 값이다 (KAN-380에서 5,000에서 올렸다).
 *
 * 여기 걸리면 오래된 기사가 사이트맵에서 소리 없이 빠진다. 조용히 잘리는 게 이
 * 라우트의 제일 위험한 실패 방식이라 아래에서 로그를 남긴다.
 */
const MAX_ARTICLE_URLS = 45000;

/**
 * 인덱스 분할을 검토해야 하는 선. 상한과 별개로 먼저 경고하는 이유는, 이 라우트가
 * 커서 페이징으로 BE를 한 페이지씩(최대 30건) 걸어오기 때문이다. 기사 수에 비례해
 * 왕복이 늘어서, 상한에 닿기 한참 전에 응답 시간이 먼저 문제가 된다.
 *
 * 값의 근거는 실측이다 (KAN-380). 기사 1,700건이 배포 환경에서 1.8초, 로컬 dev
 * 서버에서 8초였다. 5,000건이면 배포 환경도 5초를 넘길 것으로 보는데, 사이트맵이
 * 느리면 크롤러가 가져오기를 포기한다.
 *
 * 분할 자체는 BE 선행 작업이 필요하다 — 목록 응답에 총 건수가 없고 페이지 최대가
 * 30건이라, 커서를 처음부터 다시 걸어오지 않고는 "N번째 조각"을 열 수 없다.
 */
const SPLIT_REVIEW_THRESHOLD = 5000;

/**
 * 사이트맵 (KAN-346). `/sitemap.xml`로 컴파일된다.
 *
 * 정적 라우트에 BE 기사 전건(`/articles/{id}`)을 커서 페이징으로 이어 붙인다.
 * 릴 딥링크(`/reels/{id}`, KAN-349)도 같은 걸음에 싣는다 — 릴과 기사가 같은
 * `articleSummaryId` 체계라 목록을 따로 걸을 필요가 없다. 기사가 콘텐츠 정본이라
 * 우선순위는 기사보다 낮춘다. lastModified는 발행 시각이다. BE가 죽어 있으면
 * 기사 없이 정적 라우트만 내려보낸다 — 사이트맵이 500이면 크롤러가 사이트 전체를
 * 의심하므로 실패를 삼키고 부분 응답을 준다.
 *
 * 로그인·마이·온보딩은 robots에서 막거나 색인 가치가 없어 싣지 않는다.
 * 릴스 피드(`/reels`)는 색인 담당이 아니라 탐색 진입점이지만(전략 문서 리스크 4)
 * 존재 자체는 알리도록 싣는다.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/articles`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/reels`, changeFrequency: "daily", priority: 0.6 },
    // 토론 리스트 (KAN-418) — 릴스처럼 탐색 진입점으로만 싣는다
    { url: `${SITE_URL}/debates`, changeFrequency: "daily", priority: 0.6 },
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
        entries.push({
          url: `${SITE_URL}/reels/${article.id}`,
          lastModified: new Date(article.publishedAt),
          priority: 0.5,
        });
      }
      // 기사당 URL이 두 개(기사 + 릴)라 상한 판정도 URL 수로 센다
      count += page.items.length * 2;
      cursor = page.nextCursor;
    } while (cursor && count < MAX_ARTICLE_URLS);

    if (cursor) {
      console.error(
        `[sitemap] 상한(${MAX_ARTICLE_URLS})에서 잘렸다 — 이 뒤 기사는 사이트맵에 없다. 인덱스 분할이 필요하다.`,
      );
    } else if (count >= SPLIT_REVIEW_THRESHOLD) {
      console.warn(
        `[sitemap] 기사·릴 URL ${count}건. 인덱스 분할 검토선(${SPLIT_REVIEW_THRESHOLD}) 초과 — BE 총 건수 또는 사이트맵 전용 엔드포인트가 선행 과제다.`,
      );
    }
  } catch (error) {
    console.error("[sitemap] 기사 목록 로드 실패 — 정적 라우트만 응답:", error);
  }

  return entries;
}

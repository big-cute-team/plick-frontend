import type { MetadataRoute } from "next";
import {
  collectSitemapArticles,
  collectSitemapMatchIds,
} from "@plick/core/sitemap";
import { TEAMS, TEAM_ORDER } from "@plick/domain/constants";
import { GUIDE_ORDER } from "@plick/domain/guides";
import { SITE_URL } from "@/_constants/site";

/**
 * 빌드 시점이 아니라 요청 시점에 만든다 (KAN-738). 기본값(정적)이면 `next build`가 CI
 * 러너에서 BE를 불러 실패하고, 성공해도 기사 목록이 빌드 시점으로 굳어 새 기사가 다음
 * 배포까지 안 실린다. 크롤러가 가끔 받아 가는 파일이라 요청마다 도는 비용은 작다.
 *
 * 렌더는 요청마다지만 안의 기사·경기 fetch는 데이터 캐시를 탄다 (KAN-380).
 * `force-dynamic`은 fetch 옵션을 명시하지 않은 호출만 no-store로 낮추는데 두 fetcher가
 * revalidate를 명시하므로 캐시가 산다.
 */
export const dynamic = "force-dynamic";

/**
 * 색인은 되되 기사가 아닌 안내·해설 페이지. 로그인·회원가입은 색인 가치가 없어 뺀다.
 * 소개와 가이드(KAN-652)는 운영자가 쓴 본문이 있는 페이지라 안내 페이지보다 우선순위를 둔다.
 */
const STATIC_PAGES = [
  { path: "/about", priority: 0.6 },
  ...GUIDE_ORDER.map((slug) => ({ path: `/guide/${slug}`, priority: 0.6 })),
  { path: "/faq", priority: 0.3 },
  { path: "/terms", priority: 0.3 },
  { path: "/privacy", priority: 0.3 },
] as const;

/**
 * 사이트맵 (KAN-346). `/sitemap.xml`로 컴파일된다.
 *
 * 정적 라우트에 BE 기사 전건(`/articles/{id}`)과 빅6 시즌 경기(`/live/matches/{id}`)를
 * 이어 붙인다. 기사는 KAN-652에서 애드센스 거절 대응으로 뺐다가 KAN-738에서 되돌렸다.
 * 재료는 `@plick/core/sitemap`이 모으고 실패해도 던지지 않아 정적 라우트는 항상 나간다.
 * canonical은 데스크톱이지만 모바일 URL의 존재는 알린다(웹 사이트맵과 같은 목록).
 *
 * 릴 딥링크(`/reels/{id}`)는 싣지 않는다. 기사와 같은 요약을 세로로 보여 주는 화면이라
 * 색인 정본은 기사 하나로 두고 릴은 noindex다. 로그인·마이·온보딩도 색인 가치가 없어 뺀다.
 * 릴스 피드(`/reels`)는 탐색 진입점이라(전략 문서 리스크 4) 존재만 알린다.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, matchIds] = await Promise.all([
    collectSitemapArticles(),
    collectSitemapMatchIds(),
  ]);

  return [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/reels`, changeFrequency: "daily", priority: 0.6 },
    // 라이브 스코어 (KAN-452)
    { url: `${SITE_URL}/live`, changeFrequency: "hourly", priority: 0.7 },
    // 순위표 (KAN-683) - "프리미어리그 순위" 검색어 랜딩
    {
      url: `${SITE_URL}/live/standings`,
      changeFrequency: "daily",
      priority: 0.7,
    },
    // 투표·승부예측 허브 (KAN-418, KAN-623). 랭킹은 이 화면의 탭이라 따로 싣지 않는다
    { url: `${SITE_URL}/debates`, changeFrequency: "daily", priority: 0.6 },
    // 팀 허브 (KAN-350) - 팀 검색어의 랜딩이라 기사 개별 페이지보다 우선순위를 높인다
    ...TEAM_ORDER.map((code) => ({
      url: `${SITE_URL}/teams/${TEAMS[code].slug}`,
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
    // 팀 프로필 (KAN-500) - 소속 인물 목록. 인물 프로필은 200명이 넘고 대부분 관련 기사가 아직 없어 싣지 않는다
    ...TEAM_ORDER.map((code) => ({
      url: `${SITE_URL}/teams/${TEAMS[code].slug}/profile`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    // 소개·가이드·안내 페이지 (KAN-623, KAN-652) - 웹 사이트맵과 같은 몫
    ...STATIC_PAGES.map(({ path, priority }) => ({
      url: `${SITE_URL}${path}`,
      changeFrequency: "monthly" as const,
      priority,
    })),
    // 경기 상세 (KAN-738) - 스코어와 예측 집계가 바뀌는 화면이라 lastModified를 박지 않는다
    ...matchIds.map((id) => ({
      url: `${SITE_URL}/live/matches/${id}`,
      priority: 0.6,
    })),
    // 기사 상세 (KAN-346, KAN-738) - lastModified는 발행 시각이다
    ...articles.map((article) => ({
      url: `${SITE_URL}/articles/${article.id}`,
      lastModified: new Date(article.publishedAt),
      priority: 0.8,
    })),
  ];
}

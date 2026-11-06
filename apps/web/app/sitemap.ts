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
 * 검색과 AI 답변에 걸리는 롱테일 랜딩이 기사라 색인에서 빼 둘 수 없다는 판단이다. 경기
 * 상세는 전에 팀 프로필의 링크로만 발견됐는데 예측 탭과 브리핑이 본문에 실리면서 같이 싣는다.
 * 재료는 `@plick/core/sitemap`이 모으고 실패해도 던지지 않아 정적 라우트는 항상 나간다.
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
    // 투표·승부예측 허브 (KAN-418)
    { url: `${SITE_URL}/debates`, changeFrequency: "daily", priority: 0.6 },
    // 승부예측 시즌 랭킹 (KAN-701, 별도 페이지는 KAN-724 PR) - 표는 브라우저가 받아 본문은 셸뿐이다
    { url: `${SITE_URL}/rankings`, changeFrequency: "daily", priority: 0.5 },
    // 팀 허브 (KAN-350) - 팀 검색어의 랜딩이라 기사 개별 페이지보다 우선순위를 높인다
    ...TEAM_ORDER.map((code) => ({
      url: `${SITE_URL}/teams/${TEAMS[code].slug}`,
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
    // 팀 프로필 (KAN-599, KAN-623) - 인물·선수 프로필은 200명이 넘고 대부분 관련 기사가 아직 없어 싣지 않는다
    ...TEAM_ORDER.map((code) => ({
      url: `${SITE_URL}/teams/${TEAMS[code].slug}/profile`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    // 소개·가이드·안내 페이지 (KAN-623, KAN-652) - 브랜드 검색의 사이트링크 후보. 자주 안 바뀐다
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
    // 기사 상세 (KAN-346, KAN-738) - lastModified는 발행 시각이고 못 읽는 값이면 뺀다
    ...articles.map((article) => ({
      url: `${SITE_URL}/articles/${article.id}`,
      ...(article.publishedAt ? { lastModified: article.publishedAt } : {}),
      priority: 0.8,
    })),
  ];
}

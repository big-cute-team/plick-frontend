import type { MetadataRoute } from "next";
import { TEAMS, TEAM_ORDER } from "@plick/domain/constants";
import { GUIDE_ORDER } from "@plick/domain/guides";
import { SITE_URL } from "@/_constants/site";

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
 * 정적 라우트만 싣는다. 기사 상세(`/articles/{id}`)와 릴 딥링크(`/reels/{id}`)는 KAN-652에서
 * 뺐다. 본문이 원문 트윗 한두 문장의 요약이라 수천 페이지가 통째로 복제·자동 생성 콘텐츠로
 * 분류됐고(애드센스 "가치가 별로 없는 콘텐츠" 거절), 페이지 자체도 noindex다. 전에는 BE 기사
 * 전건을 커서 페이징으로 걸어와 요청 시점(`force-dynamic`)에 만들었는데, 그 호출이 없어져
 * 빌드 때 한 번 굳는 정적 파일이 됐다(KAN-380의 상한·분할 걱정도 같이 사라졌다).
 *
 * 로그인·마이·온보딩은 robots에서 막거나 색인 가치가 없어 싣지 않는다.
 * 릴스 피드(`/reels`)는 색인 담당이 아니라 탐색 진입점이지만(전략 문서 리스크 4)
 * 존재 자체는 알리도록 싣는다.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/reels`, changeFrequency: "daily", priority: 0.6 },
    // 라이브 스코어 (KAN-452) — 경기 상세는 시즌 단위로 바뀌는 임시 URL이라 목록만 싣는다
    { url: `${SITE_URL}/live`, changeFrequency: "hourly", priority: 0.7 },
    // 순위표 (KAN-683) - "프리미어리그 순위" 검색어 랜딩. 경기 상세는 팀 프로필 경기 탭 링크로 발견된다
    {
      url: `${SITE_URL}/live/standings`,
      changeFrequency: "daily",
      priority: 0.7,
    },
    // 토론 리스트 (KAN-418) — 릴스처럼 탐색 진입점으로만 싣는다
    { url: `${SITE_URL}/debates`, changeFrequency: "daily", priority: 0.6 },
    // 팀 허브 (KAN-350) — 팀 검색어의 랜딩. KAN-652부터 팀 소개 글이 본문에 실린다
    ...TEAM_ORDER.map((code) => ({
      url: `${SITE_URL}/teams/${TEAMS[code].slug}`,
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
    // 팀 프로필 (KAN-599, KAN-623) — 인물·선수 프로필은 200명이 넘고 대부분 관련 기사가 아직 없어 싣지 않는다
    ...TEAM_ORDER.map((code) => ({
      url: `${SITE_URL}/teams/${TEAMS[code].slug}/profile`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    // 소개·가이드·안내 페이지 (KAN-623, KAN-652) — 브랜드 검색의 사이트링크 후보. 자주 안 바뀐다
    ...STATIC_PAGES.map(({ path, priority }) => ({
      url: `${SITE_URL}${path}`,
      changeFrequency: "monthly" as const,
      priority,
    })),
  ];
}

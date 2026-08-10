import type { MetadataRoute } from "next";
import { IS_PRODUCTION_SITE, SITE_URL } from "@/_constants/site";

/**
 * 크롤러 정책 (KAN-346). `/robots.txt`로 컴파일된다.
 *
 * 성장 단계라 검색 엔진과 AI 크롤러(GPTBot·ClaudeBot·PerplexityBot 등)를
 * 구분 없이 전부 허용한다 — 봇별 차단 룰을 두지 않는다. 색인 가치가 없는
 * 비공개·개인화 경로만 막는다. proxy.ts matcher가 확장자 포함 경로를
 * 제외하므로 이 라우트는 세션 갱신 프록시를 타지 않는다.
 *
 * dev 빌드는 사이트맵만 뺀다 (KAN-380). 색인 차단은 루트 레이아웃의 noindex가
 * 맡는다 — 여기서 `Disallow: /`로 크롤을 막아 버리면 크롤러가 그 noindex를 읽지
 * 못해, 외부 링크로 발견된 URL이 내용 없이 색인된 채 남는다.
 */
export default function robots(): MetadataRoute.Robots {
  const rules = {
    userAgent: "*",
    allow: "/",
    disallow: ["/api/", "/oauth/", "/me/", "/onboarding/"],
  };

  if (!IS_PRODUCTION_SITE) {
    return { rules };
  }

  return { rules, sitemap: `${SITE_URL}/sitemap.xml` };
}

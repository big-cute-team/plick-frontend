import type { Metadata } from "next";
import { organizationJsonLd, webSiteJsonLd } from "@plick/domain/jsonld";
import { JsonLd } from "@plick/ui/JsonLd";
import { WEB_SITE_URL } from "@/_constants/site";
import { HomeScreen } from "./_components/HomeScreen";

/**
 * canonical은 데스크톱 홈이다 (KAN-346) — 별도 모바일 URL 패턴에서 모바일
 * 페이지는 대응 데스크톱 URL을 canonical로 가리켜 시그널을 한 도메인에 모은다.
 */
export const metadata: Metadata = {
  alternates: { canonical: `${WEB_SITE_URL}/` },
};

/**
 * 홈 라우트 — 화면 본체는 팀 허브(`/teams/[slug]`)와 공용인
 * {@link HomeScreen}이 그린다 (KAN-350).
 *
 * Organization·WebSite JSON-LD는 데스크톱 홈과 같은 값을 싣는다 (KAN-351) —
 * 구글 별도 모바일 URL 가이드가 양쪽에 동일한 구조화 데이터를 요구한다.
 * URL도 canonical 도메인 기준이다.
 */
export default function HomePage() {
  return (
    <>
      <JsonLd
        data={organizationJsonLd({
          siteUrl: WEB_SITE_URL,
          logoUrl: `${WEB_SITE_URL}/icon.png`,
        })}
      />
      <JsonLd data={webSiteJsonLd({ siteUrl: WEB_SITE_URL })} />
      <HomeScreen />
    </>
  );
}

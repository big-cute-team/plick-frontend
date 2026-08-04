import type { Metadata } from "next";
import { organizationJsonLd, webSiteJsonLd } from "@plick/domain/jsonld";
import { JsonLd } from "@plick/ui/JsonLd";
import {
  MOBILE_ALTERNATE_MEDIA,
  MOBILE_SITE_URL,
  SITE_URL,
} from "@/_constants/site";
import { HomeScreen } from "./_components/HomeScreen";

/**
 * 이 URL이 canonical이고 대응 모바일 홈을 alternate로 선언한다 (KAN-346) —
 * 별도 모바일 URL 패턴의 데스크톱 쪽 절반. 모바일 쪽 canonical과 상호 참조다.
 */
export const metadata: Metadata = {
  alternates: {
    canonical: "/",
    media: { [MOBILE_ALTERNATE_MEDIA]: `${MOBILE_SITE_URL}/` },
  },
};

/**
 * 데스크톱 홈 라우트 — 화면 본체는 팀 허브(`/teams/[slug]`)와 공용인
 * {@link HomeScreen}이 그린다 (KAN-350).
 *
 * 홈은 브랜드 검색("plick", "플릭")의 랜딩이라 발행 주체(Organization)와
 * 사이트(WebSite) JSON-LD를 여기 싣는다 (KAN-351).
 */
export default function HomePage() {
  return (
    <>
      <JsonLd
        data={organizationJsonLd({
          siteUrl: SITE_URL,
          logoUrl: `${SITE_URL}/icon.png`,
        })}
      />
      <JsonLd data={webSiteJsonLd({ siteUrl: SITE_URL })} />
      <HomeScreen />
    </>
  );
}

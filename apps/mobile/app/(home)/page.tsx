import type { Metadata } from "next";
import { BRAND_FULL_TITLE, BRAND_NAME_KO } from "@plick/domain/brand";
import { organizationJsonLd, webSiteJsonLd } from "@plick/domain/jsonld";
import { JsonLd } from "@plick/ui/JsonLd";
import { WEB_SITE_URL } from "@/_constants/site";
import { HomeScreen } from "./_components/HomeScreen";

/**
 * canonical은 데스크톱 홈이다 (KAN-346) — 별도 모바일 URL 패턴에서 모바일
 * 페이지는 대응 데스크톱 URL을 canonical로 가리켜 시그널을 한 도메인에 모은다.
 *
 * 공유 카드 제목은 태그라인까지 붙인 전체 문구다 (KAN-742). 탭 이름(`title`)은 루트 기본값이다.
 * 하위 세그먼트의 `openGraph`는 부모 것을 통째로 덮어 siteName과 파일 기반 이미지까지 다시 적는다. 루트에 제목을
 * 두면 자기 `openGraph`가 없는 모든 페이지가 이 제목을 물려받아 홈에만 둔다.
 */
export const metadata: Metadata = {
  alternates: { canonical: `${WEB_SITE_URL}/` },
  openGraph: {
    title: BRAND_FULL_TITLE,
    siteName: BRAND_NAME_KO,
    type: "website",
    locale: "ko_KR",
    images: ["/opengraph-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND_FULL_TITLE,
    images: ["/opengraph-image.png"],
  },
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

import type { Metadata } from "next";
import {
  ABOUT_DESCRIPTION,
  ABOUT_SECTIONS,
  ABOUT_TITLE,
} from "@plick/domain/about";
import { ProseBody } from "@plick/ui/ProseBody";
import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";
import { SiteFooter } from "@/_components/SiteFooter";
import { MOBILE_ALTERNATE_MEDIA, MOBILE_SITE_URL } from "@/_constants/site";

/** 이 URL이 canonical이고 대응 모바일 페이지를 alternate로 선언한다 (KAN-346 규약). */
export const metadata: Metadata = {
  title: "소개",
  description: ABOUT_DESCRIPTION,
  alternates: {
    canonical: "/about",
    media: { [MOBILE_ALTERNATE_MEDIA]: `${MOBILE_SITE_URL}/about` },
  },
};

/**
 * 서비스 소개 (KAN-652) - 수집 방식, 콘텐츠 원칙, 화면 구성, 운영자와 문의처. 애드센스가
 * "가치가 별로 없는 콘텐츠"로 거절한 뒤 "누가 무엇을 어떻게 하는 사이트인가"를 한 페이지에
 * 모았다. 읽기 폭(max-w-read) 한 열이고 문안은 `@plick/domain/about`이 모바일과 단일 출처다.
 */
export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageContainer className="pt-6.5 pb-12">
          <div className="max-w-read">
            <h1 className="text-section text-text-strong tracking-title font-black">
              {ABOUT_TITLE}
            </h1>
            <div className="pt-5">
              <ProseBody sections={ABOUT_SECTIONS} />
            </div>
          </div>
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}

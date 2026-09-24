import type { Metadata } from "next";
import { PAGE_DESCRIPTIONS } from "@plick/domain/brand";
import { TermsBody } from "@plick/ui/TermsBody";
import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";
import { SiteFooter } from "@/_components/SiteFooter";

export const metadata: Metadata = {
  title: "이용약관",
  description: PAGE_DESCRIPTIONS.terms,
};

/**
 * 이용약관 (KAN-372) — GNB 아래 페이지 컨테이너의 읽기 폭(max-w-read) 한 열 (KAN-567 톤).
 * 본문은 mobile과 문안이 어긋나면 안 되는 법률 문서라 `@plick/ui`의
 * `TermsBody`가 단일 출처다.
 */
export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageContainer className="pt-6.5 pb-12">
          <div className="max-w-read">
            <h1 className="text-section text-text-strong tracking-title font-black">
              이용약관
            </h1>
            <div className="pt-5">
              <TermsBody />
            </div>
          </div>
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}

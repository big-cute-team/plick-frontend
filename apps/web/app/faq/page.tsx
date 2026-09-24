import type { Metadata } from "next";
import { PAGE_DESCRIPTIONS } from "@plick/domain/brand";
import { FaqBody } from "@plick/ui/FaqBody";
import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";
import { SiteFooter } from "@/_components/SiteFooter";

export const metadata: Metadata = {
  title: "FAQ",
  description: PAGE_DESCRIPTIONS.faq,
};

/**
 * FAQ (KAN-372) — GNB 아래 페이지 컨테이너의 읽기 폭(max-w-read) 한 열 (KAN-567 톤).
 * 문안은 mobile과 같아야 해서 `@plick/ui`의 `FaqBody`가 단일 출처다.
 */
export default function FaqPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageContainer className="pt-6.5 pb-12">
          <div className="max-w-read">
            <h1 className="text-section text-text-strong tracking-title font-black">
              자주 묻는 질문
            </h1>
            <div className="pt-5">
              <FaqBody />
            </div>
          </div>
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}

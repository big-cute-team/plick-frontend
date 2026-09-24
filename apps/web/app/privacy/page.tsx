import type { Metadata } from "next";
import { PAGE_DESCRIPTIONS } from "@plick/domain/brand";
import { PrivacyPolicyBody } from "@plick/ui/PrivacyPolicyBody";
import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";
import { SiteFooter } from "@/_components/SiteFooter";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: PAGE_DESCRIPTIONS.privacy,
};

/**
 * 개인정보처리방침 (KAN-369) — GNB 아래 페이지 컨테이너의 읽기 폭(max-w-read) 한 열 (KAN-567 톤).
 * 본문은 mobile과 문안이 어긋나면 안 되는 법률 문서라 `@plick/ui`의
 * `PrivacyPolicyBody`가 단일 출처다.
 */
export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageContainer className="pt-6.5 pb-12">
          <div className="max-w-read">
            <h1 className="text-section text-text-strong tracking-title font-black">
              개인정보처리방침
            </h1>
            <div className="pt-5">
              <PrivacyPolicyBody />
            </div>
          </div>
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}

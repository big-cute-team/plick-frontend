import type { Metadata } from "next";
import { PAGE_DESCRIPTIONS } from "@plick/domain/brand";
import { TermsBody } from "@plick/ui/TermsBody";
import { SiteHeader } from "@/_components/SiteHeader";

export const metadata: Metadata = {
  title: "이용약관",
  description: PAGE_DESCRIPTIONS.terms,
};

/**
 * 이용약관 (KAN-372) — GNB + 중앙 정렬 좁은 컬럼(max-w-narrow).
 * 본문은 mobile과 문안이 어긋나면 안 되는 법률 문서라 `@plick/ui`의
 * `TermsBody`가 단일 출처다.
 */
export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <div className="max-w-narrow mx-auto w-full px-6 pt-9 pb-22">
          <h1 className="text-hero text-text tracking-heading font-extrabold">
            이용약관
          </h1>

          <div className="pt-5.5">
            <TermsBody />
          </div>
        </div>
      </main>
    </>
  );
}

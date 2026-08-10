import type { Metadata } from "next";
import { PAGE_DESCRIPTIONS } from "@plick/domain/brand";
import { FaqBody } from "@plick/ui/FaqBody";
import { SiteHeader } from "@/_components/SiteHeader";

export const metadata: Metadata = {
  title: "FAQ",
  description: PAGE_DESCRIPTIONS.faq,
};

/**
 * FAQ (KAN-372) — GNB + 중앙 정렬 좁은 컬럼(max-w-narrow).
 * 문안은 mobile과 같아야 해서 `@plick/ui`의 `FaqBody`가 단일 출처다.
 */
export default function FaqPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <div className="max-w-narrow mx-auto w-full px-6 pt-9 pb-22">
          <h1 className="text-hero text-text tracking-heading font-extrabold">
            자주 묻는 질문
          </h1>

          <div className="pt-5.5">
            <FaqBody />
          </div>
        </div>
      </main>
    </>
  );
}

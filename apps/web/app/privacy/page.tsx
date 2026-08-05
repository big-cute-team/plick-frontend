import type { Metadata } from "next";
import { PrivacyPolicyBody } from "@plick/ui/PrivacyPolicyBody";
import { SiteHeader } from "@/_components/SiteHeader";

export const metadata: Metadata = {
  title: "개인정보처리방침",
};

/**
 * 개인정보처리방침 (KAN-369) — GNB + 중앙 정렬 좁은 컬럼(max-w-narrow).
 * 본문은 mobile과 문안이 어긋나면 안 되는 법률 문서라 `@plick/ui`의
 * `PrivacyPolicyBody`가 단일 출처다.
 */
export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <div className="max-w-narrow mx-auto w-full px-6 pt-9 pb-22">
          <h1 className="text-hero text-text tracking-heading font-extrabold">
            개인정보처리방침
          </h1>

          <div className="pt-5.5">
            <PrivacyPolicyBody />
          </div>
        </div>
      </main>
    </>
  );
}

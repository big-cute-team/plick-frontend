import type { Metadata } from "next";
import { PAGE_DESCRIPTIONS } from "@plick/domain/brand";
import { PrivacyPolicyBody } from "@plick/ui/PrivacyPolicyBody";
import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { SubTopBar } from "@/_components/SubTopBar";
import { WEB_SITE_URL } from "@/_constants/site";

/** canonical은 데스크톱 개인정보처리방침이다 (KAN-623) — 모바일 홈 canonical과 같은 이유. */
export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: PAGE_DESCRIPTIONS.privacy,
  alternates: { canonical: `${WEB_SITE_URL}/privacy` },
};

/**
 * 개인정보처리방침. 로그인 없이 열리는 공개 문서 (KAN-369). 상단 바는 공용 `SubTopBar`다(KAN-567).
 * 스토어 제출 양식에 넣을 URL이 이 페이지다. 본문은 web과 문안이 어긋나면
 * 안 되는 법률 문서라 `@plick/ui`의 `PrivacyPolicyBody`가 단일 출처다.
 */
export default function PrivacyPage() {
  return (
    <AppShell>
      <SubTopBar title="개인정보처리방침" backHref="/me" backBehavior="back" />

      <ScrollArea>
        <div className="px-edge pt-4 pb-12">
          <PrivacyPolicyBody />
        </div>
      </ScrollArea>
    </AppShell>
  );
}

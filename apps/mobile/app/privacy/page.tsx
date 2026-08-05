import type { Metadata } from "next";
import { PrivacyPolicyBody } from "@plick/ui/PrivacyPolicyBody";
import { AppShell } from "@/_components/AppShell";
import { DocTopBar } from "@/_components/DocTopBar";
import { ScrollArea } from "@/_components/ScrollArea";

export const metadata: Metadata = {
  title: "개인정보처리방침",
};

/**
 * 개인정보처리방침 — 로그인 없이 열리는 공개 문서 (KAN-369).
 * 스토어 제출 양식에 넣을 URL이 이 페이지다. 본문은 web과 문안이 어긋나면
 * 안 되는 법률 문서라 `@plick/ui`의 `PrivacyPolicyBody`가 단일 출처다.
 */
export default function PrivacyPage() {
  return (
    <AppShell>
      <DocTopBar title="개인정보처리방침" />

      <ScrollArea>
        <div className="px-edge pt-4 pb-12">
          <PrivacyPolicyBody />
        </div>
      </ScrollArea>
    </AppShell>
  );
}

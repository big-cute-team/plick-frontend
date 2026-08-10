import type { Metadata } from "next";
import { PAGE_DESCRIPTIONS } from "@plick/domain/brand";
import { TermsBody } from "@plick/ui/TermsBody";
import { AppShell } from "@/_components/AppShell";
import { DocTopBar } from "@/_components/DocTopBar";
import { ScrollArea } from "@/_components/ScrollArea";

export const metadata: Metadata = {
  title: "이용약관",
  description: PAGE_DESCRIPTIONS.terms,
};

/**
 * 이용약관 — 로그인 없이 열리는 공개 문서 (KAN-372).
 * 회원가입 동의 문구와 MY 페이지에서 진입한다. 본문은 web과 문안이 어긋나면
 * 안 되는 법률 문서라 `@plick/ui`의 `TermsBody`가 단일 출처다.
 */
export default function TermsPage() {
  return (
    <AppShell>
      <DocTopBar title="이용약관" />

      <ScrollArea>
        <div className="px-edge pt-4 pb-12">
          <TermsBody />
        </div>
      </ScrollArea>
    </AppShell>
  );
}

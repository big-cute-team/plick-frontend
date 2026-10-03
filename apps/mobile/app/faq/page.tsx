import type { Metadata } from "next";
import { PAGE_DESCRIPTIONS } from "@plick/domain/brand";
import { FaqBody } from "@plick/ui/FaqBody";
import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { SubTopBar } from "@/_components/SubTopBar";

export const metadata: Metadata = {
  title: "FAQ",
  description: PAGE_DESCRIPTIONS.faq,
};

/**
 * FAQ (KAN-372). MY 맨 아래 링크에서 진입한다. 상단 바는 공용 `SubTopBar`고
 * 뒤로가기는 히스토리 back, 스토어 심사원처럼 URL로 직접 들어왔으면 MY로 간다(KAN-567).
 * 문안은 web과 같아야 해서 `@plick/ui`의 `FaqBody`가 단일 출처다.
 */
export default function FaqPage() {
  return (
    <AppShell>
      <SubTopBar title="FAQ" backHref="/me" backBehavior="back" />

      <ScrollArea>
        <div className="px-edge pt-4 pb-12">
          <FaqBody />
        </div>
      </ScrollArea>
    </AppShell>
  );
}

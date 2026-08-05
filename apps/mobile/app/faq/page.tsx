import type { Metadata } from "next";
import { FaqBody } from "@plick/ui/FaqBody";
import { AppShell } from "@/_components/AppShell";
import { DocTopBar } from "@/_components/DocTopBar";
import { ScrollArea } from "@/_components/ScrollArea";

export const metadata: Metadata = {
  title: "FAQ",
};

/**
 * FAQ — 자주 묻는 질문 아코디언 (KAN-372). MY 페이지에서 진입한다.
 * 문안은 web과 같아야 해서 `@plick/ui`의 `FaqBody`가 단일 출처다.
 */
export default function FaqPage() {
  return (
    <AppShell>
      <DocTopBar title="FAQ" />

      <ScrollArea>
        <div className="px-edge pt-4 pb-12">
          <FaqBody />
        </div>
      </ScrollArea>
    </AppShell>
  );
}

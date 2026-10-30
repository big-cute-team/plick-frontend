import type { Metadata } from "next";
import {
  ABOUT_DESCRIPTION,
  ABOUT_SECTIONS,
  ABOUT_TITLE,
} from "@plick/domain/about";
import { ProseBody } from "@plick/ui/ProseBody";
import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { SubTopBar } from "@/_components/SubTopBar";
import { WEB_SITE_URL } from "@/_constants/site";

/** canonical은 데스크톱 소개 페이지다 (KAN-623) - 모바일 홈 canonical과 같은 이유. */
export const metadata: Metadata = {
  title: "소개",
  description: ABOUT_DESCRIPTION,
  alternates: { canonical: `${WEB_SITE_URL}/about` },
};

/**
 * 서비스 소개 (KAN-652). MY 맨 아래 링크와 홈 푸터에서 진입한다. 상단 바는 공용 `SubTopBar`고
 * 뒤로가기는 히스토리 back, URL로 직접 들어왔으면 홈으로 간다. 문안은 `@plick/domain/about`이
 * 웹과 단일 출처다.
 */
export default function AboutPage() {
  return (
    <AppShell>
      <SubTopBar title={ABOUT_TITLE} backHref="/" backBehavior="back" />

      <ScrollArea>
        <div className="px-edge pt-4 pb-12">
          <ProseBody sections={ABOUT_SECTIONS} />
        </div>
      </ScrollArea>
    </AppShell>
  );
}

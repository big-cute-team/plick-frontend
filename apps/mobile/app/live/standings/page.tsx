import type { Metadata } from "next";
import { MOCK_STANDINGS } from "@plick/domain/live-mock";
import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { TabBar } from "@/_components/TabBar";
import { TopBar } from "@/_components/TopBar";
import { LiveSubTabs } from "@/live/_components/LiveSubTabs";
import { StandingsTable } from "@/live/_components/StandingsTable";

/** 목데이터 지면이라 noindex — API가 붙으면 canonical과 함께 다시 쓴다. */
export const metadata: Metadata = {
  title: "순위표",
  robots: { index: false },
};

/**
 * 순위표 라우트(피그마 L3, KAN-446). 서브탭을 URL로 승격한 두 번째 지면이다.
 * 폴링이 없는 단발 읽기(서버 캐시 1시간)라 실배선도 서버 컴포넌트 fetch로
 * 간다(ADR 0126).
 */
export default function StandingsPage() {
  return (
    <AppShell>
      <TopBar />
      <ScrollArea>
        <LiveSubTabs active="standings" />
        <StandingsTable rows={MOCK_STANDINGS} />
      </ScrollArea>
      <TabBar />
    </AppShell>
  );
}

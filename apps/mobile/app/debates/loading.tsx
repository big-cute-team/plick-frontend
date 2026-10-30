import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { TabBar } from "@/_components/TabBar";
import { TopBar } from "@/_components/TopBar";
import { DebatesFeedSkeleton } from "./_components/DebatesFeedSkeleton";

/**
 * 투표 리스트의 로딩 자리 (KAN-602). 리스트(`GET /debates`, 익명 ISR이라 재생성
 * 중에만 보인다)를 기다리는 동안 상단바, 탭 줄, 카드 뼈대를 먼저 그린다.
 */
export default function DebatesLoading() {
  return (
    <AppShell>
      <TopBar />
      <ScrollArea restoreLanding={false}>
        <DebatesFeedSkeleton />
      </ScrollArea>
      <TabBar />
    </AppShell>
  );
}

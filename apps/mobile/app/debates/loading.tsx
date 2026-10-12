import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { TabBar } from "@/_components/TabBar";
import { TopBar } from "@/_components/TopBar";
import { DEBATE_TABS } from "@/_constants/debates";
import { DebateListSkeleton } from "./_components/DebateListSkeleton";

/**
 * 투표 리스트의 로딩 자리 (KAN-602). 리스트(`GET /debates`, 토큰을 실어 캐시를 못
 * 탄다)를 기다리는 동안 상단바, 탭 줄, 카드 뼈대를 먼저 그린다. 탭 줄은 어느 탭이
 * 열릴지 아직 몰라 밑줄 없이 라벨만 둔다.
 */
export default function DebatesLoading() {
  return (
    <AppShell>
      <TopBar />
      <ScrollArea>
        <div aria-hidden className="border-border px-edge flex gap-5 border-b">
          {DEBATE_TABS.map(({ key, label }) => (
            <span
              key={key}
              className="text-tab text-text-3 shrink-0 border-b-2 border-transparent pt-3 pb-2.5 font-medium"
            >
              {label}
            </span>
          ))}
        </div>
        <section className="px-edge">
          <DebateListSkeleton />
        </section>
      </ScrollArea>
      <TabBar />
    </AppShell>
  );
}

import { Suspense } from "react";
import { AppShell } from "@/_components/AppShell";
import { TabBar } from "@/_components/TabBar";
import { TopBar } from "@/_components/TopBar";
import { DebatesFeedSkeleton } from "./DebatesFeedSkeleton";
import { DebatesScrollArea } from "./DebatesScrollArea";
import { DebatesSection } from "./DebatesSection";

/**
 * 투표 화면 본체 (KAN-418, KAN-567 리디자인).
 *
 * 상단 바 아래에 진행 중 / 마감 탭 줄과 투표 카드 리스트가 온다. 화면 제목과
 * 안내 문구는 시안대로 뺐다(기능 설명 문구 금지). 리스트에서 바로 투표되고, 마감
 * 탭은 결과만 읽는다. BE에 필터·페이지네이션이 없어 팀 탭도 무한스크롤도 없는
 * 단순 리스트다.
 *
 * 리스트 조회는 {@link DebatesSection}이 Suspense 안에서 맡는다 (KAN-602). 셸은
 * 기다리지 않고 바로 나간다.
 */
export function DebatesScreen() {
  return (
    <AppShell>
      <TopBar />
      <DebatesScrollArea>
        {/* 페이지의 h1 — 시안에 제목이 없어 보이지 않게 둔다(크롤러·보조기술용) */}
        <h1 className="sr-only">투표</h1>
        <Suspense fallback={<DebatesFeedSkeleton />}>
          <DebatesSection />
        </Suspense>
      </DebatesScrollArea>
      <TabBar />
    </AppShell>
  );
}

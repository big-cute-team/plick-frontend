import { Suspense } from "react";
import { AppShell } from "@/_components/AppShell";
import { TabBar } from "@/_components/TabBar";
import { TopBar } from "@/_components/TopBar";
import { DebatesFeedSkeleton } from "./DebatesFeedSkeleton";
import { DebatesScrollArea } from "./DebatesScrollArea";
import { DebatesSection } from "./DebatesSection";

/** VS 셸. 서버는 밸런스게임 씨앗을 받고, 클라이언트에서 세 탭을 전환한다. */
export function DebatesScreen() {
  return (
    <AppShell>
      <TopBar />
      <DebatesScrollArea>
        {/* 페이지의 h1 — 시안에 제목이 없어 보이지 않게 둔다(크롤러·보조기술용) */}
        <h1 className="sr-only">VS</h1>
        <Suspense fallback={<DebatesFeedSkeleton />}>
          <DebatesSection />
        </Suspense>
      </DebatesScrollArea>
      <TabBar />
    </AppShell>
  );
}

import { Suspense } from "react";
import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";
import { DebateListSkeleton } from "./DebateListSkeleton";
import { DebatesSection } from "./DebatesSection";
import { DebateTabBar } from "./DebateTabs";
import { DEFAULT_DEBATE_TAB } from "@/_utils/debates";
import { SiteFooter } from "@/_components/SiteFooter";
import { LiveStrip } from "@/_components/LiveStrip";
import { SideRail } from "@/_components/SideRail";

/** VS 셸. 서버는 밸런스게임 씨앗을 받고, 클라이언트에서 두 탭을 전환한다. 랭킹은 `/rankings`다. */
export function DebatesScreen() {
  return (
    <>
      <SiteHeader />
      <LiveStrip />
      <main>
        <PageContainer className="grid grid-cols-1 gap-10 pt-6.5 pb-12 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-11">
          <div className="min-w-0">
            <h1 className="text-section text-text-strong tracking-title pb-5 font-black">
              VS
            </h1>
            <Suspense
              fallback={
                <>
                  <DebateTabBar tab={DEFAULT_DEBATE_TAB} />
                  <DebateListSkeleton />
                </>
              }
            >
              <DebatesSection />
            </Suspense>
          </div>
          <SideRail />
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}

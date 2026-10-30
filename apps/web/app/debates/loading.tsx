import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";
import { TrendingRailSkeleton } from "@/_components/TrendingRailSkeleton";
import { DEBATE_TABS } from "@/_constants/debates";
import { DebateListSkeleton } from "./_components/DebateListSkeleton";

/**
 * 투표 화면의 로딩 자리 (KAN-602). 목록(`GET /debates`, 익명 ISR이라 재생성 중에만 보인다)을
 * 기다리는 동안 상단 바, 제목, 탭 줄, 카드 뼈대, 우측 급상승 레일 뼈대를 먼저 그린다.
 * 탭 줄은 어느 탭이 열릴지 아직 몰라 밑줄 없이 라벨만 둔다.
 */
export default function DebatesLoading() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageContainer className="grid grid-cols-1 gap-10 pt-6.5 pb-12 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-11">
          <div className="min-w-0">
            <h1 className="text-section text-text-strong tracking-title pb-5 font-black">
              투표
            </h1>
            <div
              aria-hidden
              className="border-border flex items-center gap-5 border-b"
            >
              {DEBATE_TABS.map(({ key, label }) => (
                <span
                  key={key}
                  className="text-body text-text-3 -mb-px border-b-2 border-transparent pb-2.25 font-medium"
                >
                  {label}
                </span>
              ))}
            </div>
            <DebateListSkeleton />
          </div>
          <aside className="hidden lg:block">
            <TrendingRailSkeleton />
          </aside>
        </PageContainer>
      </main>
    </>
  );
}

import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";
import { TrendingRailSkeleton } from "@/_components/TrendingRailSkeleton";
import { PredictionSectionSkeleton } from "./_components/PredictionSectionSkeleton";
import { NewsSectionSkeleton } from "./_components/NewsSectionSkeleton";

/**
 * 홈과 팀 허브(`/teams/[slug]`)의 로딩 자리 (KAN-602). 페이지가 BE 조회를 기다리는 동안 상단 바는
 * 실물로, 승부예측 카드와 이슈 표, 우측 급상승 레일은 뼈대로 먼저 그린다. LIVE 띠는 경기 유무를
 * 모르니 비워 두고, 투표 띠(KAN-710)는 있을 때만 서는 한 줄이라 자리를 잡지 않는다.
 */
export default function HomeLoading() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageContainer className="grid grid-cols-1 items-start gap-8.5 pt-5.5 pb-8.5 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0">
            <PredictionSectionSkeleton />
            <NewsSectionSkeleton />
          </div>
          <aside className="hidden lg:block">
            <TrendingRailSkeleton />
          </aside>
        </PageContainer>
      </main>
    </>
  );
}

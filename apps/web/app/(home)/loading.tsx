import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";
import { PredictionSectionSkeleton } from "./_components/PredictionSectionSkeleton";
import { NewsSectionSkeleton } from "./_components/NewsSectionSkeleton";

/** 홈과 팀 허브의 참여 카드·기사 로딩 자리. */
export default function HomeLoading() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageContainer className="pt-5.5 pb-8.5">
          <div className="min-w-0">
            <PredictionSectionSkeleton />
            <PredictionSectionSkeleton title="투표" />
            <NewsSectionSkeleton />
          </div>
        </PageContainer>
      </main>
    </>
  );
}

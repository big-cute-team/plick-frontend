import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";
import { PredictionSectionSkeleton } from "./_components/PredictionSectionSkeleton";
import { NewsSectionSkeleton } from "./_components/NewsSectionSkeleton";

/** 홈과 팀 허브의 승부예측 카드·기사 로딩 자리. 투표는 띠(KAN-710)라 자리를 잡지 않는다. */
export default function HomeLoading() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageContainer className="pt-5.5 pb-8.5">
          <div className="min-w-0">
            <PredictionSectionSkeleton />
            <NewsSectionSkeleton />
          </div>
        </PageContainer>
      </main>
    </>
  );
}

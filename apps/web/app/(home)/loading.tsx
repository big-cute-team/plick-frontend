import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";
import { TrendingRailSkeleton } from "@/_components/TrendingRailSkeleton";
import { HotSectionSkeleton } from "./_components/HotSectionSkeleton";
import { NewsSectionSkeleton } from "./_components/NewsSectionSkeleton";

/**
 * 홈과 팀 허브(`/teams/[slug]`)의 로딩 자리 (KAN-602). 페이지가 BE 조회를 기다리는
 * 동안 상단 바는 실물로, 핫이슈와 이슈 표, 우측 급상승 레일은 뼈대로 먼저 그린다.
 * 상단 탭을 누르는 순간 화면이 바뀌고 활성 표시도 따라온다. 이게 없으면 BE가 느릴 때
 * 응답이 올 때까지 옛 화면이 그대로 멈춰 있다.
 *
 * LIVE 띠는 경기 유무를 모르니 비워 둔다(기사 상세 로딩과 같은 판단).
 */
export default function HomeLoading() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageContainer className="grid grid-cols-1 items-start gap-8.5 pt-5.5 pb-8.5 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0">
            <HotSectionSkeleton />
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

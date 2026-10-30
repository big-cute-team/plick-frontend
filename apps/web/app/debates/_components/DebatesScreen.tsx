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

/**
 * 데스크톱 투표 화면 본체 (KAN-418 → KAN-567 시안 투표 1064-1213행). GNB 아래
 * `minmax(0,1fr) 288px` 그리드에 제목 "투표" 22/900, 진행 중, 마감 탭 줄, 투표 목록을
 * 두고 우측 aside는 급상승과 채팅방 레일 자리다. 전에는 "VS" 제목에 안내 부제가
 * 있는 단일 컬럼이었다.
 *
 * 카드는 여기서 바로 투표한다(`DebateVoteCard`). 전에는 표시 전용 카드를 눌러 기사
 * 상세로 보냈다. BE에 필터, 페이지네이션이 없어 팀 탭도 무한스크롤도 없다. 탭의
 * 원본은 URL `?tab=`이고 탭 줄과 목록이 브라우저에서 읽는다 (KAN-667). 서버가 쿼리를
 * 읽으면 페이지가 동적이 돼 익명 ISR이 안 되기 때문이다. 읽는 건 `useDebateTab`이다
 * (KAN-683). 전에는 `useSearchParams`를 각자 Suspense 안에서 읽었는데 그 훅이 정적
 * 페이지에서 Suspense 경계까지 클라 렌더로 미뤄 서버 HTML이 스켈레톤뿐이었다. 지금은
 * 탭 줄과 목록을 `DebatesFeed`가 함께 그려 기본 탭 목록이 서버 HTML에 실린다.
 *
 * 목록 조회는 {@link DebatesSection}이 Suspense 안에서 맡는다 (KAN-602). 상단 바,
 * 제목, 탭 줄, 레일 틀은 기다리지 않고 바로 나간다.
 */
export function DebatesScreen() {
  return (
    <>
      <SiteHeader />
      <LiveStrip />
      <main>
        <PageContainer className="grid grid-cols-1 gap-10 pt-6.5 pb-12 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-11">
          <div className="min-w-0">
            <h1 className="text-section text-text-strong tracking-title pb-5 font-black">
              투표
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

import Link from "next/link";
import { Suspense } from "react";
import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";
import { DEBATE_TABS } from "@/_constants/debates";
import type { DebateTab } from "@/_types/debates";
import { DebateListSkeleton } from "./DebateListSkeleton";
import { DebatesSection } from "./DebatesSection";
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
 * 원본은 URL `?tab=`이라 링크로 그린다.
 *
 * 목록 조회는 {@link DebatesSection}이 Suspense 안에서 맡는다 (KAN-602). 상단 바,
 * 제목, 탭 줄, 레일 틀은 기다리지 않고 바로 나간다.
 *
 * @param tab 지금 탭
 */
export function DebatesScreen({ tab }: { tab: DebateTab }) {
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
            <div
              role="tablist"
              aria-label="투표 상태"
              className="border-border flex items-center gap-5 border-b"
            >
              {DEBATE_TABS.map(({ key, label, href }) => {
                const on = key === tab;
                return (
                  <Link
                    key={key}
                    href={href}
                    role="tab"
                    aria-selected={on}
                    className={`text-body focus-visible:outline-accent -mb-px border-b-2 pb-2.25 focus-visible:outline-2 focus-visible:outline-offset-2 ${
                      on
                        ? "border-accent text-text-strong font-bold"
                        : "hover:text-text-strong text-text-3 border-transparent font-medium"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
            <Suspense fallback={<DebateListSkeleton />}>
              <DebatesSection tab={tab} />
            </Suspense>
          </div>
          <SideRail />
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}

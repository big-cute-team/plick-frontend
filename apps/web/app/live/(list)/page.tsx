import type { Metadata } from "next";
import { PAGE_DESCRIPTIONS } from "@plick/domain/brand";
import { Suspense } from "react";
import { isDateKey, todayDateKeyKst } from "@plick/domain/live";
import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";
import { MOBILE_ALTERNATE_MEDIA, MOBILE_SITE_URL } from "@/_constants/site";
import { DateStrip } from "@/live/_components/DateStrip";
import { LiveMatchesSection } from "@/live/_components/LiveMatchesSection";
import { MatchListSkeleton } from "@/live/_components/MatchListSkeleton";
import { StandingsRailSkeleton } from "@/live/_components/StandingsRailSkeleton";
import { StandingsSection } from "@/live/_components/StandingsSection";
import { SiteFooter } from "@/_components/SiteFooter";
import { LiveStrip } from "@/_components/LiveStrip";

/**
 * 이 URL이 canonical이고 대응 모바일 LIVE 탭을 alternate로 선언한다. 토론
 * 리스트와 같은 상호 참조 규약. 날짜 쿼리 URL도 canonical은 `/live`다.
 */
export const metadata: Metadata = {
  title: "LIVE",
  description: PAGE_DESCRIPTIONS.live,
  alternates: {
    canonical: "/live",
    media: { [MOBILE_ALTERNATE_MEDIA]: `${MOBILE_SITE_URL}/live` },
  },
};

/**
 * LIVE 목록 (KAN-452 → KAN-567 리디자인, 시안 LIVE 741-817행). 데스크톱은 순위를 별도
 * 라우트로 빼지 않고 `minmax(0,1fr) 340px` 2열(경기 목록 + 순위표 aside)로 항상 함께
 * 보여준다. 목록은 서버 씨앗 + 클라 폴링, 순위표는 서버 컴포넌트 fetch(단발 읽기)다.
 * 둘은 독립이라 각자 Suspense 경계 안에서 받아 따로 스트리밍되고(KAN-602), 한쪽이
 * 실패해도 다른 쪽은 그대로 뜬다. 시안의 안내 부제는 지웠다.
 */
export default async function LivePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const today = todayDateKeyKst();
  const selected = isDateKey(date) ? date : today;

  return (
    <>
      <SiteHeader />
      <LiveStrip />
      <main>
        <PageContainer className="grid grid-cols-1 gap-10 pt-6.5 pb-12 lg:grid-cols-[minmax(0,1fr)_21.25rem] lg:gap-11">
          <div className="min-w-0">
            <h1 className="text-section text-text-strong tracking-title pb-4.5 font-black">
              LIVE
            </h1>
            <DateStrip selected={selected} today={today} />
            <Suspense fallback={<MatchListSkeleton />}>
              <LiveMatchesSection date={selected} />
            </Suspense>
          </div>
          <aside>
            <Suspense fallback={<StandingsRailSkeleton />}>
              <StandingsSection />
            </Suspense>
          </aside>
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}

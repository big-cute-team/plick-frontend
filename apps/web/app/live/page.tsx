import type { Metadata } from "next";
import { PAGE_DESCRIPTIONS } from "@plick/domain/brand";
import { getMatches, getStandings } from "@plick/core/live";
import { isDateKey, todayDateKeyKst } from "@plick/domain/live";
import type { InitialMatchList, StandingRow } from "@plick/domain/live";
import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";
import { MOBILE_ALTERNATE_MEDIA, MOBILE_SITE_URL } from "@/_constants/site";
import { DateStrip } from "./_components/DateStrip";
import { LiveLoadError } from "./_components/LiveLoadError";
import { LiveMatchesFeed } from "./_components/LiveMatchesFeed";
import { StandingsRail } from "./_components/StandingsRail";

/**
 * 이 URL이 canonical이고 대응 모바일 LIVE 탭을 alternate로 선언한다 — 토론
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
 * LIVE 대시보드(피그마 LW1~LW3, KAN-452). 데스크톱은 순위를 별도 라우트로
 * 빼지 않고 2컬럼(경기 목록 + 순위표 레일)으로 항상 함께 보여준다. 목록은
 * 서버 씨앗 + 클라 폴링, 순위표는 서버 컴포넌트 fetch(단발 읽기)다. 둘은
 * 독립이라 한쪽이 실패해도 다른 쪽은 그대로 뜬다.
 */
export default async function LivePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const today = todayDateKeyKst();
  const selected = isDateKey(date) ? date : today;

  const [matches, standings] = await Promise.allSettled([
    getMatches(selected),
    getStandings(),
  ]);

  let initial: InitialMatchList | undefined;
  if (matches.status === "fulfilled") {
    initial = { items: matches.value, fetchedAt: Date.now() };
  } else {
    console.error("[live] 경기 목록 초기 로드 실패:", matches.reason);
  }

  let rows: StandingRow[] | undefined;
  if (standings.status === "fulfilled") {
    rows = standings.value;
  } else {
    console.error("[live] 순위표 로드 실패:", standings.reason);
  }

  return (
    <>
      <SiteHeader />
      <main>
        <PageContainer className="pb-22">
          <header className="pt-7 pb-4.5">
            <h1 className="text-hero text-text tracking-heading font-extrabold">
              LIVE
            </h1>
            <p className="text-body text-text-3 mt-1.5 font-semibold">
              프리미어리그 경기와 순위를 한눈에 볼 수 있어요
            </p>
          </header>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex flex-col gap-1">
              <DateStrip selected={selected} today={today} />
              <LiveMatchesFeed date={selected} initial={initial} />
            </div>
            {rows ? (
              <StandingsRail rows={rows} />
            ) : (
              <section className="bg-elevate rounded-card h-fit px-4 py-5">
                <h2 className="text-title text-text px-1 pb-3 font-bold">
                  순위표
                </h2>
                <LiveLoadError compact />
              </section>
            )}
          </div>
        </PageContainer>
      </main>
    </>
  );
}

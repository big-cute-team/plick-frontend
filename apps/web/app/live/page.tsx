import type { Metadata } from "next";
import {
  MOCK_MATCH_DAYS,
  MOCK_STANDINGS,
  MOCK_TODAY,
} from "@plick/domain/live-mock";
import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";
import { DateStrip } from "./_components/DateStrip";
import { LiveEmptyDay } from "./_components/LiveEmptyDay";
import { LiveLoadError } from "./_components/LiveLoadError";
import { MatchDayList } from "./_components/MatchDayList";
import { StandingsRail } from "./_components/StandingsRail";

/**
 * 아직 목데이터 지면이라 색인 신호를 보내지 않는다 — API가 붙으면
 * 기사·토론 리스트처럼 description과 canonical(+ 모바일 alternate)을 붙인다.
 */
export const metadata: Metadata = {
  title: "LIVE",
  robots: { index: false },
};

/**
 * LIVE 대시보드(피그마 LW1~LW3, KAN-446). 데스크톱은 모바일과 달리 순위를
 * 별도 라우트로 빼지 않고 2컬럼(경기 목록 + 순위표 레일)으로 항상 함께
 * 보여준다. lg 아래에선 1열로 스택된다(레일을 숨기지 않는다). 날짜는
 * `/live?date=` 쿼리, `?demo=error`는 에러 지면 확인용 임시 훅(배선 때 삭제).
 */
export default async function LivePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; demo?: string }>;
}) {
  const { date, demo } = await searchParams;
  const selected = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : MOCK_TODAY;
  const matches = MOCK_MATCH_DAYS[selected] ?? [];

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
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex flex-col gap-1">
              <DateStrip selected={selected} />
              {demo === "error" ? (
                <LiveLoadError />
              ) : matches.length > 0 ? (
                <MatchDayList matches={matches} />
              ) : (
                <LiveEmptyDay />
              )}
            </div>
            <StandingsRail rows={MOCK_STANDINGS} />
          </div>
        </PageContainer>
      </main>
    </>
  );
}

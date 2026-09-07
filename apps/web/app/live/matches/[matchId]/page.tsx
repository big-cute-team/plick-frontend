import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MOCK_MATCH_DETAILS } from "@plick/domain/live-mock";
import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";
import { GoalsCard } from "@/live/_components/GoalsCard";
import { LineupCard } from "@/live/_components/LineupCard";
import { MatchHeaderCard } from "@/live/_components/MatchHeaderCard";
import { PreviewGrid } from "@/live/_components/PreviewGrid";
import { StatsRail } from "@/live/_components/StatsRail";
import { TimelineCard } from "@/live/_components/TimelineCard";

/** 목데이터 지면이라 noindex — 배선 후 실경기 메타로 다시 쓴다. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ matchId: string }>;
}): Promise<Metadata> {
  const { matchId } = await params;
  const detail = MOCK_MATCH_DETAILS[Number(matchId)];
  if (!detail) return {};
  return {
    title: `${detail.header.home.name} vs ${detail.header.away.name}`,
    robots: { index: false },
  };
}

/**
 * 경기 상세(피그마 LW4·LW5, KAN-446). 데스크톱은 모바일의 내부 탭 대신 지면을
 * 넓게 써서 요약·라인업(좌)과 스탯(우 레일)을 한 번에 노출한다. SCHEDULED는
 * 프리뷰 2컬럼, POSTPONED·CANCELLED는 헤더와 안내만. 블록별 null 조건부
 * 렌더가 기본이다(서버가 조각 실패 시 그 조각만 빼고 내리는 구조).
 */
export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const detail = MOCK_MATCH_DETAILS[Number(matchId)];
  if (!detail) notFound();

  const { header } = detail;

  return (
    <>
      <SiteHeader />
      <main>
        <PageContainer className="pt-6 pb-22">
          <MatchHeaderCard header={header} />
          {header.status === "SCHEDULED" && detail.preview ? (
            <PreviewGrid preview={detail.preview} />
          ) : header.status === "POSTPONED" || header.status === "CANCELLED" ? (
            <p className="text-body text-text-4 py-20 text-center">
              {header.status === "POSTPONED"
                ? "경기가 연기됐어요. 새 일정은 추후 공지돼요."
                : "취소된 경기예요."}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-5 pt-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="flex flex-col gap-3">
                {detail.events ? (
                  <>
                    <GoalsCard events={detail.events} />
                    <TimelineCard header={header} events={detail.events} />
                  </>
                ) : (
                  <p className="text-body text-text-4 py-10 text-center">
                    요약 정보가 아직 없어요
                  </p>
                )}
                {detail.lineups && (
                  <LineupCard
                    home={detail.lineups.home}
                    away={detail.lineups.away}
                  />
                )}
              </div>
              {detail.stats ? (
                <StatsRail stats={detail.stats} status={header.status} />
              ) : (
                <p className="text-body text-text-4 py-10 text-center">
                  스탯 정보가 아직 없어요
                </p>
              )}
            </div>
          )}
        </PageContainer>
      </main>
    </>
  );
}

import type { Metadata } from "next";
import { MOCK_MATCH_DAYS, MOCK_TODAY } from "@plick/domain/live-mock";
import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { TabBar } from "@/_components/TabBar";
import { TopBar } from "@/_components/TopBar";
import { DateStrip } from "./_components/DateStrip";
import { LiveEmptyDay } from "./_components/LiveEmptyDay";
import { LiveLoadError } from "./_components/LiveLoadError";
import { LiveSubTabs } from "./_components/LiveSubTabs";
import { MatchDayList } from "./_components/MatchDayList";

/**
 * 아직 목데이터 지면이라 색인 신호를 보내지 않는다 — API가 붙으면
 * 기사·토론 리스트처럼 description과 canonical(+ 모바일 alternate)을 붙인다.
 */
export const metadata: Metadata = {
  title: "LIVE",
  robots: { index: false },
};

/**
 * LIVE 탭 경기 목록(피그마 L1·L2·L4, KAN-446). 날짜는 `/live?date=YYYY-MM-DD`
 * 쿼리로 승격돼 있고 없으면 기준일(껍데기 단계는 `MOCK_TODAY`, 실배선 때
 * KST 오늘)이다. `?demo=error`는 에러 지면 확인용 임시 훅 — 배선 세션에서
 * 502 응답 분기로 바꾸며 지운다.
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
    <AppShell>
      <TopBar />
      <ScrollArea>
        <LiveSubTabs active="matches" />
        <DateStrip selected={selected} />
        {demo === "error" ? (
          <LiveLoadError />
        ) : matches.length > 0 ? (
          <MatchDayList matches={matches} />
        ) : (
          <LiveEmptyDay />
        )}
      </ScrollArea>
      <TabBar />
    </AppShell>
  );
}

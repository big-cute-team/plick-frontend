import type { Metadata } from "next";
import { PAGE_DESCRIPTIONS } from "@plick/domain/brand";
import { getMatches } from "@plick/core/live";
import { isDateKey, todayDateKeyKst } from "@plick/domain/live";
import type { InitialMatchList } from "@plick/domain/live";
import { AppShell } from "@/_components/AppShell";
import { TabBar } from "@/_components/TabBar";
import { TopBar } from "@/_components/TopBar";
import { WEB_SITE_URL } from "@/_constants/site";
import { DateStrip } from "./_components/DateStrip";
import { LiveDatePager } from "./_components/LiveDatePager";
import { LiveMatchesFeed } from "./_components/LiveMatchesFeed";
import { LiveScrollArea } from "./_components/LiveScrollArea";
import { LiveSubTabs } from "./_components/LiveSubTabs";

/**
 * canonical은 날짜 쿼리와 무관하게 대응 데스크톱 `/live`다 — 날짜별 URL은
 * 같은 지면의 필터라 색인 시그널을 한 곳에 모은다(기사 목록과 같은 규약).
 */
export const metadata: Metadata = {
  title: "LIVE",
  description: PAGE_DESCRIPTIONS.live,
  alternates: { canonical: `${WEB_SITE_URL}/live` },
};

/**
 * LIVE 탭 경기 목록(피그마 L1·L2·L4, KAN-446 → KAN-452 배선). 날짜는
 * `/live?date=YYYY-MM-DD` 쿼리로 승격돼 있고 없거나 깨졌으면 KST 오늘이다.
 *
 * 첫 목록은 서버에서 받아 씨앗으로 내려주고(토론 리스트와 같은 패턴), 이후
 * 폴링·재시도는 클라 훅이 맡는다. 서버 fetch가 실패하면(502 등) 씨앗 없이
 * 내려보내 클라가 다시 받고, 그것도 실패하면 목록 자리에만 에러 지면이 선다.
 *
 * 목록을 좌우로 끌면 전날·다음날로 넘어가고(`LiveDatePager`), 맨 위에서 당기면
 * 그 날짜 목록을 다시 받는다(`LiveScrollArea`, KAN-462).
 */
export default async function LivePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const today = todayDateKeyKst();
  const selected = isDateKey(date) ? date : today;

  let initial: InitialMatchList | undefined;
  try {
    initial = { items: await getMatches(selected), fetchedAt: Date.now() };
  } catch (error) {
    console.error("[live] 경기 목록 초기 로드 실패:", error);
  }

  return (
    <AppShell>
      <TopBar />
      <LiveScrollArea date={selected}>
        <LiveSubTabs active="matches" />
        <DateStrip selected={selected} today={today} />
        <LiveDatePager date={selected} today={today}>
          <LiveMatchesFeed date={selected} initial={initial} />
        </LiveDatePager>
      </LiveScrollArea>
      <TabBar />
    </AppShell>
  );
}

import type { Metadata } from "next";
import { PAGE_DESCRIPTIONS } from "@plick/domain/brand";
import { CHAT_ENABLED } from "@plick/core/chat";
import { getMatches, getStandings } from "@plick/core/live";
import { isDateKey, todayDateKeyKst } from "@plick/domain/live";
import type {
  InitialMatchList,
  MatchSummary,
  StandingRow,
} from "@plick/domain/live";
import { AppShell } from "@/_components/AppShell";
import { TabBar } from "@/_components/TabBar";
import { TopBar } from "@/_components/TopBar";
import { WEB_SITE_URL } from "@/_constants/site";
import { ChatRoomBanner } from "./_components/ChatRoomBanner";
import { DateStrip } from "./_components/DateStrip";
import { LiveDatePager } from "./_components/LiveDatePager";
import { LiveMatchesFeed } from "./_components/LiveMatchesFeed";
import { LiveScrollArea } from "./_components/LiveScrollArea";
import { StandingsTable } from "./_components/StandingsTable";

/**
 * canonical은 날짜 쿼리와 무관하게 대응 데스크톱 `/live`다. 날짜별 URL은
 * 같은 지면의 필터라 색인 시그널을 한 곳에 모은다(기사 목록과 같은 규약).
 */
export const metadata: Metadata = {
  title: "LIVE",
  description: PAGE_DESCRIPTIONS.live,
  alternates: { canonical: `${WEB_SITE_URL}/live` },
};

/**
 * LIVE 탭 (KAN-446 → KAN-452 배선, 시안 KAN-567 "LIVE 목록"). 위에서부터 채팅방
 * 배너, 날짜 라벨과 7일 날짜 줄, 그 날짜의 경기 행, 맨 아래 순위표 20팀이다.
 * 전에는 경기/순위 서브탭으로 두 라우트를 오갔는데 시안이 한 지면에 다 두므로
 * 서브탭을 없애고 순위표를 목록 아래 붙였다. `/live/standings`는 그대로 남는다.
 *
 * 날짜는 `/live?date=YYYY-MM-DD` 쿼리로 승격돼 있고 없거나 깨졌으면 KST 오늘이다.
 *
 * 첫 목록은 서버에서 받아 씨앗으로 내려주고(토론 리스트와 같은 패턴), 이후
 * 폴링·재시도는 클라 훅이 맡는다. 서버 fetch가 실패하면(502 등) 씨앗 없이
 * 내려보내 클라가 다시 받고, 그것도 실패하면 목록 자리에만 에러 지면이 선다.
 * 순위표는 폴링 없는 단발 읽기라 서버에서 받고, 실패하면 표 자리에 문구만 둔다.
 * 목록과 순위표는 서로 독립이라 병렬로 받는다.
 *
 * 채팅방 배너는 오늘 진행 중인 경기가 있을 때만 선다. 다른 날짜를 보고 있으면
 * 오늘 목록을 따로 받아 판정하는데, 채팅이 닫혀 있는 동안(`CHAT_ENABLED`)은
 * 그 왕복을 아예 하지 않는다.
 *
 * 목록을 좌우로 끌면 전날·다음날로 넘어가고(`LiveDatePager`), 맨 위에서 당기면
 * 그 날짜 목록을 다시 받는다(`LiveScrollArea`, KAN-462).
 *
 * 스크롤 영역의 콘텐츠를 `flex min-h-full flex-col`로 열고 페이저에 `flex-1`을
 * 줘서, 경기가 두세 개뿐인 날에도 목록 아래 빈 자리까지 전부 스와이프 영역이
 * 되게 한다. 그 전에는 카드 상자 위에서만 제스처가 먹었다.
 */
export default async function LivePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const today = todayDateKeyKst();
  const selected = isDateKey(date) ? date : today;

  const [matchResult, standingsResult, todayResult] = await Promise.allSettled([
    getMatches(selected),
    getStandings(),
    CHAT_ENABLED && selected !== today
      ? getMatches(today)
      : Promise.resolve<MatchSummary[] | null>(null),
  ]);

  let initial: InitialMatchList | undefined;
  if (matchResult.status === "fulfilled") {
    initial = { items: matchResult.value, fetchedAt: Date.now() };
  } else {
    console.error("[live] 경기 목록 초기 로드 실패:", matchResult.reason);
  }

  let standings: StandingRow[] | null = null;
  if (standingsResult.status === "fulfilled") standings = standingsResult.value;
  else console.error("[live] 순위표 로드 실패:", standingsResult.reason);

  /* 오늘을 보고 있으면 목록 씨앗이 곧 오늘 목록이다. 따로 받은 날은 그 결과를,
     못 받은 날은 빈 배열로 접어 배너만 조용히 빠진다 */
  const todayMatches =
    selected === today
      ? (initial?.items ?? [])
      : todayResult.status === "fulfilled"
        ? (todayResult.value ?? [])
        : [];

  return (
    <AppShell>
      <TopBar />
      <LiveScrollArea
        date={selected}
        contentClassName="flex min-h-full flex-col pb-5.5"
      >
        <ChatRoomBanner matches={todayMatches} />
        <DateStrip selected={selected} today={today} />
        <LiveDatePager date={selected} today={today} className="flex-1">
          <LiveMatchesFeed date={selected} initial={initial} />
        </LiveDatePager>
        <section className="px-edge pt-7">
          {standings ? (
            <StandingsTable rows={standings} title="순위표" legend />
          ) : (
            <p className="text-body text-text-4 py-10 text-center">
              순위표를 불러오지 못했어요
            </p>
          )}
        </section>
      </LiveScrollArea>
      <TabBar />
    </AppShell>
  );
}

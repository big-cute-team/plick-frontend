import type { Metadata } from "next";
import { PAGE_DESCRIPTIONS } from "@plick/domain/brand";
import { getStandings } from "@plick/core/live";
import { AppShell } from "@/_components/AppShell";
import { TabBar } from "@/_components/TabBar";
import { TopBar } from "@/_components/TopBar";
import { WEB_SITE_URL } from "@/_constants/site";
import { LiveLoadError } from "@/live/_components/LiveLoadError";
import { LiveScrollArea } from "@/live/_components/LiveScrollArea";
import { LiveSubTabs } from "@/live/_components/LiveSubTabs";
import { StandingsTable } from "@/live/_components/StandingsTable";

/**
 * 요청 시점에 렌더한다 (sitemap과 같은 이유). 이 라우트는 쿼리도 쿠키도 없어
 * 기본값이면 `next build`가 CI 러너에서 BE를 불러 실패한 에러 지면을 정적
 * HTML로 굳힌다. 안의 순위표 fetch는 `apiFetch`가 revalidate를 명시하므로
 * force-dynamic이어도 데이터 캐시(60초)는 그대로 산다.
 */
export const dynamic = "force-dynamic";

/** 데스크톱은 순위표가 `/live` 대시보드 레일에 있어 canonical을 거기로 둔다. */
export const metadata: Metadata = {
  title: "순위표",
  description: PAGE_DESCRIPTIONS.standings,
  alternates: { canonical: `${WEB_SITE_URL}/live` },
};

/**
 * 순위표 라우트(피그마 L3, KAN-452). 폴링이 없는 단발 읽기라 서버 컴포넌트
 * fetch다 — BE 캐시 1시간에 `apiFetch` 익명 GET 캐시 60초가 겹친다. 실패하면
 * 표 자리에 에러 지면을 두고 다시 시도는 세그먼트 새로고침이다. 맨 위에서
 * 당기면 서버 갱신(`router.refresh`)을 기다렸다 스피너를 멈춘다(KAN-462).
 */
export default async function StandingsPage() {
  let rows;
  try {
    rows = await getStandings();
  } catch (error) {
    console.error("[live] 순위표 로드 실패:", error);
  }

  return (
    <AppShell>
      <TopBar />
      <LiveScrollArea>
        <LiveSubTabs active="standings" />
        {rows ? <StandingsTable rows={rows} /> : <LiveLoadError />}
      </LiveScrollArea>
      <TabBar />
    </AppShell>
  );
}

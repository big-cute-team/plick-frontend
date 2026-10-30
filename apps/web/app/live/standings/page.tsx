import type { Metadata } from "next";
import { PAGE_DESCRIPTIONS } from "@plick/domain/brand";
import { LIVE_SEASON_LABEL } from "@plick/domain/live";
import { PageContainer } from "@/_components/PageContainer";
import { SiteFooter } from "@/_components/SiteFooter";
import { SiteHeader } from "@/_components/SiteHeader";
import { MOBILE_ALTERNATE_MEDIA, MOBILE_SITE_URL } from "@/_constants/site";
import { LiveStrip } from "@/_components/LiveStrip";
import { StandingsSection } from "@/live/_components/StandingsSection";

/**
 * 요청 시점에 렌더한다 (모바일 `/live/standings`와 같은 이유). 쿼리도 쿠키도 없는 라우트라
 * 기본값이면 `next build`가 CI 러너에서 BE를 불러 실패한 에러 지면을 정적 HTML로 굳힌다.
 * 안의 순위표 fetch는 `apiFetch` 익명 GET 캐시(60초)를 그대로 탄다.
 */
export const dynamic = "force-dynamic";

/** 이 URL이 canonical이고 대응 모바일 순위표를 alternate로 선언한다 (KAN-346 규약). */
export const metadata: Metadata = {
  title: "프리미어리그 순위표",
  description: PAGE_DESCRIPTIONS.standings,
  alternates: {
    canonical: "/live/standings",
    media: { [MOBILE_ALTERNATE_MEDIA]: `${MOBILE_SITE_URL}/live/standings` },
  },
};

/**
 * 데스크톱 순위표 (KAN-683). 전에는 순위표가 `/live` 레일에만 있어 데스크톱에 고유 URL이
 * 없었고 모바일 `/live/standings`의 canonical이 `/live`를 가리켰다. "프리미어리그 순위"
 * 검색어의 랜딩으로 쓰려고 표 하나만 두는 페이지를 만들고 사이트맵에 싣는다. 표는 레일과
 * 같은 `StandingsSection`이라 폭을 레일만큼으로 제한한다.
 */
export default function StandingsPage() {
  return (
    <>
      <SiteHeader />
      <LiveStrip />
      <main>
        <PageContainer className="pt-6.5 pb-12">
          <h1 className="text-section text-text-strong tracking-title pb-1.5 font-black">
            프리미어리그 순위표
          </h1>
          <p className="text-body text-text-3 pb-6">
            {LIVE_SEASON_LABEL} 시즌 20팀의 승점과 득실, 챔피언스리그 진출권.
          </p>
          <div className="max-w-read">
            <StandingsSection />
          </div>
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}

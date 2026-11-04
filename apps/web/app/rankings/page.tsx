import type { Metadata } from "next";
import { PAGE_DESCRIPTIONS } from "@plick/domain/brand";
import { LiveStrip } from "@/_components/LiveStrip";
import { PageContainer } from "@/_components/PageContainer";
import { SideRail } from "@/_components/SideRail";
import { SiteFooter } from "@/_components/SiteFooter";
import { SiteHeader } from "@/_components/SiteHeader";
import { MOBILE_ALTERNATE_MEDIA, MOBILE_SITE_URL } from "@/_constants/site";
import { PredictionRanking } from "./_components/PredictionRanking";

/**
 * 이 URL이 canonical이고 대응 모바일 랭킹 탭(`/debates?tab=rank`)을 alternate로 선언한다 (KAN-346
 * 규약). 모바일은 랭킹이 VS 안의 탭 그대로다.
 */
export const metadata: Metadata = {
  title: "승부예측 랭킹",
  description: PAGE_DESCRIPTIONS.rankings,
  alternates: {
    canonical: "/rankings",
    media: { [MOBILE_ALTERNATE_MEDIA]: `${MOBILE_SITE_URL}/debates?tab=rank` },
  },
};

/**
 * 데스크톱 승부예측 시즌 랭킹 페이지 (KAN-701의 랭킹 탭을 KAN-724 PR에서 GNB 탭으로 뺐다). 전에는 VS의
 * 셋째 탭(`/debates?tab=rank`)이었는데 밸런스게임, 승부예측과 성격이 달라 상단 바에 따로 세운다. 옛 주소는
 * `useDebateTab`이 여기로 바꿔 보낸다.
 *
 * 표는 사람마다 다른 `me`가 실려 브라우저에서 받는다(`usePredictionRankings`). 서버는 셸만 그리므로
 * 정적 페이지다. 본문 폭과 우측 레일은 VS 화면과 같다.
 */
export default function RankingsPage() {
  return (
    <>
      <SiteHeader />
      <LiveStrip />
      <main>
        <PageContainer className="grid grid-cols-1 gap-10 pt-6.5 pb-12 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-11">
          <div className="min-w-0">
            <h1 className="text-section text-text-strong tracking-title pb-1.5 font-black">
              랭킹
            </h1>
            <p className="text-body text-text-3">
              승부예측 적중 기록으로 매기는 시즌 랭킹이에요.
            </p>
            <PredictionRanking />
          </div>
          <SideRail />
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}

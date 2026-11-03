import { Suspense } from "react";
import { HomeTrends } from "./HomeTrends";
import { HomeLive } from "./HomeLive";
import { DebateSection } from "./DebateSection";
import { TEAM_FULL_NAMES } from "@plick/domain/constants";
import type { Filter } from "@plick/domain/types";
import { AdSlot } from "@/_components/AdSlot";
import { CHAT_ENABLED } from "@plick/core/chat";
import { LiveChatPanel } from "@/_components/LiveChatPanel";
import { FeedPullRefresh } from "@/_components/FeedPullRefresh";
import { PageContainer } from "@/_components/PageContainer";
import { SiteFooter } from "@/_components/SiteFooter";
import { SiteHeader } from "@/_components/SiteHeader";
import { SkyscraperAd } from "@/_components/SkyscraperAd";
import { HomeIntro } from "./HomeIntro";
import { TeamIntro } from "./TeamIntro";
import { NewsSection } from "./NewsSection";
import { NewsSectionSkeleton } from "./NewsSectionSkeleton";
import { PredictionSection } from "./PredictionSection";
import { PredictionSectionSkeleton } from "./PredictionSectionSkeleton";

/**
 * 홈과 팀 허브: 실검 → 투표 → 경기 → 승부예측 → 채팅 → 기사. 섹션은 독립 스트리밍한다. 투표는
 * KAN-710에서 승부예측 아래 카드 트랙이던 것을 실검 바로 아래 띠로 올렸다.
 */
export function HomeScreen({ team = "ALL" }: { team?: Filter }) {
  return (
    <>
      <SiteHeader />
      <main>
        {/* 좁은 화면에서 맨 위를 당기면 새로고침 (KAN-379). sticky인 SiteHeader는
            transform 껍데기 밖에 둬야 해서 본문만 감싼다 */}
        <FeedPullRefresh surface="news">
          <PageContainer className="pt-5.5 pb-8.5">
            <div className="min-w-0">
              {/* 페이지의 h1 — 화면(UX)은 홈과 같아야 해서 양쪽 다 보이지 않게 둔다.
                  팀 허브는 팀 검색어, 홈은 브랜드·카테고리 검색어를 받는 랜딩이다 (KAN-380) */}
              <h1 className="sr-only">
                {team !== "ALL"
                  ? `${TEAM_FULL_NAMES[team]} 이적 루머`
                  : "해축이모 프리미어리그 이적 루머와 이슈"}
              </h1>

              <Suspense fallback={null}>
                <HomeTrends />
              </Suspense>
              <Suspense fallback={null}>
                <DebateSection />
              </Suspense>
              <Suspense fallback={null}>
                <HomeLive />
              </Suspense>
              <Suspense fallback={<PredictionSectionSkeleton />}>
                <PredictionSection />
              </Suspense>
              {CHAT_ENABLED && <LiveChatPanel home />}

              {/* 광고 (KAN-652) — 채팅방과 기사 사이 가로 배너, 목록 끝 푸터 위 가로 배너.
                  자리는 미리 잡혀 있어 광고가 늦게 와도 목록이 밀리지 않는다 */}
              <AdSlot placement="feedBanner" className="mt-6.5" />

              <Suspense fallback={<NewsSectionSkeleton />}>
                <NewsSection team={team} />
              </Suspense>

              {/* 팀 소개 (KAN-652) - 팀 허브에만. 탭을 따라가야 해서 클라에서 URL의 팀을 읽는다 */}
              <TeamIntro />

              <AdSlot placement="bottomBanner" className="mt-8.5" />
            </div>
          </PageContainer>
        </FeedPullRefresh>
        <SkyscraperAd />

        {/* 푸터 — 당겨서 새로고침 transform 밖에 둬 풀 제스처에 딸려 움직이지
            않는다. 소개문은 팀 탭을 따라가야 해서 클라 조각을 넘긴다 (KAN-384) */}
        <SiteFooter intro={<HomeIntro />} />
      </main>
    </>
  );
}

import { Suspense } from "react";
import { DebateSection } from "./DebateSection";
import { TEAM_FULL_NAMES } from "@plick/domain/constants";
import type { Filter } from "@plick/domain/types";
import { AdSlot } from "@/_components/AdSlot";
import { FeedPullRefresh } from "@/_components/FeedPullRefresh";
import { LiveStrip } from "@/_components/LiveStrip";
import { PageContainer } from "@/_components/PageContainer";
import { SideRail } from "@/_components/SideRail";
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
 * 데스크톱 홈 화면 본체 (KAN-200, 시안 KAN-567 "홈"). 상단 바, LIVE 띠, 본문 2단(왼쪽 투표 띠, 승부예측
 * 한 줄, 이슈 표. 오른쪽 레일에 실시간 급상승과 채팅방), 푸터다. 홈(`/`)과 팀 허브(`/teams/[slug]`)가
 * 같은 화면을 그린다 (KAN-350).
 *
 * KAN-703에서 모바일과 같은 1단(실검 띠, 경기 띠, 승부예측, 투표 트랙, 채팅방 카드, 기사)으로 바꿨다가
 * KAN-710에서 시안의 2단으로 되돌렸다. 실검과 채팅방은 다른 페이지와 같은 우측 레일(`SideRail chat`)로,
 * 경기는 다른 페이지와 같은 `LiveStrip`으로 돌아가고, 투표만 모바일처럼 본문 맨 위 한 줄 띠로 남는다.
 * 홈 전용이던 `HomeTrendTicker`, `HomeLiveTicker`와 채팅방 카드의 `home` 모양은 지웠다.
 *
 * 껍데기(상단 바, 제목, 레일 틀, 푸터)는 데이터를 기다리지 않고 바로 나가고, 투표 띠, 승부예측, 이슈 표는
 * 각자 자기 데이터를 받아 Suspense 경계마다 스트리밍된다 (KAN-602). 레일의 급상승도 자기 경계 안에서
 * 따로 흐른다 (KAN-501).
 *
 * @param team 서버 렌더할 팀 필터. 홈은 전체(기본값), 팀 허브는 slug의 팀.
 */
export function HomeScreen({ team = "ALL" }: { team?: Filter }) {
  return (
    <>
      <SiteHeader />
      <LiveStrip />
      <main>
        {/* 좁은 화면에서 맨 위를 당기면 새로고침 (KAN-379). sticky인 SiteHeader는
            transform 껍데기 밖에 둬야 해서 본문만 감싼다 */}
        <FeedPullRefresh surface="news">
          <PageContainer className="grid grid-cols-1 items-start gap-8.5 pt-5.5 pb-8.5 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="min-w-0">
              {/* 페이지의 h1 — 화면(UX)은 홈과 같아야 해서 양쪽 다 보이지 않게 둔다.
                  팀 허브는 팀 검색어, 홈은 브랜드·카테고리 검색어를 받는 랜딩이다 (KAN-380) */}
              <h1 className="sr-only">
                {team !== "ALL"
                  ? `${TEAM_FULL_NAMES[team]} 이적 루머`
                  : "해축이모 프리미어리그 이적 루머와 이슈"}
              </h1>

              {/* 진행 중인 투표 띠 (KAN-710). 모바일처럼 본문 맨 위 한 줄이고 없으면 자리도 없다 */}
              <Suspense fallback={null}>
                <DebateSection />
              </Suspense>
              <Suspense fallback={<PredictionSectionSkeleton />}>
                <PredictionSection />
              </Suspense>

              {/* 광고 (KAN-652) — 승부예측과 기사 사이 가로 배너, 목록 끝 푸터 위 가로 배너.
                  자리는 미리 잡혀 있어 광고가 늦게 와도 목록이 밀리지 않는다 */}
              <AdSlot placement="feedBanner" className="mt-6.5" />

              <Suspense fallback={<NewsSectionSkeleton />}>
                <NewsSection team={team} />
              </Suspense>

              {/* 팀 소개 (KAN-652) - 팀 허브에만. 탭을 따라가야 해서 클라에서 URL의 팀을 읽는다 */}
              <TeamIntro />

              <AdSlot placement="bottomBanner" className="mt-8.5" />
            </div>

            <SideRail chat />
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

import { Suspense } from "react";
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
import { HotSection } from "./HotSection";
import { HotSectionSkeleton } from "./HotSectionSkeleton";
import { NewsSection } from "./NewsSection";
import { NewsSectionSkeleton } from "./NewsSectionSkeleton";

/**
 * 데스크톱 홈 화면 본체 (KAN-200, 시안 KAN-567 "홈") — 상단 바, LIVE 띠, 핫이슈 한 줄,
 * "새로 올라온 이슈" 표, 우측 레일, 푸터.
 *
 * 홈(`/`)과 팀 허브(`/teams/[slug]`)가 같은 화면을 그린다 (KAN-350). 팀 허브는
 * 팀 검색어를 받아줄 크롤러블 URL이 필요해서 만들었는데, UX는 홈에서 팀 탭을
 * 고른 상태와 완전히 같아야 하므로 별도 화면을 만들지 않고 이 컴포넌트를 팀만
 * 바꿔 재사용한다. 모바일 홈과 같은 구조다.
 *
 * 껍데기(상단 바, 제목, 레일 틀, 푸터)는 데이터를 기다리지 않고 바로 나가고, LIVE 띠,
 * 핫이슈, 이슈 표는 각자 자기 데이터를 받아 Suspense 경계마다 스트리밍된다 (KAN-602).
 * 예전에는 세 조회를 맨 위에서 다 기다려 가장 느린 하나(주로 오늘 경기)가 화면 전체를
 * 붙잡았다. 섹션마다 실패를 스스로 접으므로 한쪽이 실패해도 페이지는 뜬다.
 * 레일의 실시간 급상승은 원래부터 자기 경계 안에서 따로 흐른다 (KAN-501).
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

              <Suspense fallback={<HotSectionSkeleton />}>
                <HotSection />
              </Suspense>

              {/* 광고 (KAN-652) — 핫이슈와 새 이슈 사이 가로 배너, 목록 끝 푸터 위 가로 배너.
                  자리는 미리 잡혀 있어 광고가 늦게 와도 목록이 밀리지 않는다 */}
              <AdSlot placement="feedBanner" className="mt-6.5" />

              <Suspense fallback={<NewsSectionSkeleton />}>
                <NewsSection team={team} />
              </Suspense>

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

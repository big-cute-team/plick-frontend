import { Suspense } from "react";
import { TEAM_FULL_NAMES } from "@plick/domain/constants";
import type { Filter } from "@plick/domain/types";
import { AdSlot } from "@/_components/AdSlot";
import { AppShell } from "@/_components/AppShell";
import { TabBar } from "@/_components/TabBar";
import { TopBar } from "@/_components/TopBar";
import { HomeBanners } from "./HomeBanners";
import { HomeFooter } from "./HomeFooter";
import { HomeIntro } from "./HomeIntro";
import { HomeScrollArea } from "./HomeScrollArea";
import { TeamIntro } from "./TeamIntro";
import { HotSection } from "./HotSection";
import { HotSectionSkeleton } from "./HotSectionSkeleton";
import { NewsSection } from "./NewsSection";
import { NewsSectionSkeleton } from "./NewsSectionSkeleton";

/**
 * 홈 화면 본체 (KAN-163, 시안 KAN-567 "홈") — LIVE·VS 띠, 핫이슈 상자, 지금 올라온 소식.
 *
 * 홈(`/`)과 팀 허브(`/teams/[slug]`)가 같은 화면을 그린다 (KAN-350). 팀 허브는
 * "토트넘 이적 루머" 같은 팀 검색어를 받아줄 크롤러블 URL이 필요해서 만들었는데,
 * UX는 홈에서 팀 탭을 고른 상태와 완전히 같아야 하므로 별도 화면을 만들지 않고
 * 이 컴포넌트를 팀만 바꿔 재사용한다.
 *
 * 껍데기(상단바, 탭바, 제목, 소개, 푸터)는 데이터를 기다리지 않고 바로 나가고, 섹션
 * 셋은 각자 자기 데이터를 받아 Suspense 경계마다 스트리밍된다 (KAN-602). 예전에는
 * 네 조회를 맨 위에서 다 기다려 가장 느린 하나(주로 오늘 경기)가 화면 전체를 붙잡았다.
 * 섹션마다 실패를 스스로 접으므로 한쪽이 실패해도 페이지는 뜬다.
 *
 * @param team 서버 렌더할 팀 필터. 홈은 전체(기본값), 팀 허브는 slug의 팀.
 */
export function HomeScreen({ team = "ALL" }: { team?: Filter }) {
  return (
    <AppShell>
      <TopBar />
      <HomeScrollArea>
        {/* 페이지의 h1 — 화면(UX)은 홈과 같아야 해서 양쪽 다 보이지 않게 둔다.
            팀 허브는 팀 검색어, 홈은 브랜드·카테고리 검색어를 받는 랜딩이다 (KAN-380) */}
        <h1 className="sr-only">
          {team !== "ALL"
            ? `${TEAM_FULL_NAMES[team]} 이적 루머`
            : "해축이모 프리미어리그 이적 루머와 이슈"}
        </h1>

        {/* LIVE·VS 띠는 없는 날과 같게 비워 두고 기다린다 */}
        <Suspense fallback={null}>
          <HomeBanners />
        </Suspense>

        <Suspense fallback={<HotSectionSkeleton />}>
          <HotSection />
        </Suspense>

        {/* 광고 (KAN-652) — 핫이슈와 새 이슈 사이, 기사 더 보기 아래. PC를 참고해
            최소화한 두 자리다. 자리는 미리 잡혀 광고가 늦게 와도 목록이 밀리지 않는다 */}
        <AdSlot placement="homeFeed" className="px-edge mt-5" />

        <Suspense fallback={<NewsSectionSkeleton />}>
          <NewsSection team={team} />
        </Suspense>

        {/* 팀 소개 (KAN-652) - 팀 허브에만. 탭을 따라가야 해서 클라에서 URL의 팀을 읽는다 */}
        <TeamIntro />

        <AdSlot placement="homeBottom" className="px-edge mt-6" />

        {/* 크롤러블 서비스 소개 (KAN-384) */}
        <HomeIntro />

        {/* SEO 푸터 (KAN-386 후속) */}
        <HomeFooter />
      </HomeScrollArea>
      <TabBar />
    </AppShell>
  );
}

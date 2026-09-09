"use client";

import { useState } from "react";
import type { InitialMatchDetail } from "@plick/domain/live";
import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";
import { MATCH_TABS_BY_STATUS } from "@/_constants/live";
import { useMatchDetail } from "@/_hooks/useMatchDetail";
import type { MatchTabKey } from "@/_types/live";
import { LiveLoadError } from "./LiveLoadError";
import { MatchChatPanel } from "./MatchChatPanel";
import { MatchDetailTabs } from "./MatchDetailTabs";
import { MatchHeaderCard } from "./MatchHeaderCard";
import { MatchTabBar } from "./MatchTabBar";
import { PreviewGrid } from "./PreviewGrid";
import { SameDayMatchesStrip } from "./SameDayMatchesStrip";

/**
 * 경기 상세 화면 본체 (KAN-452 → KAN-462 네이버 스포츠식 재배치). 좌측 넓은
 * 컬럼에 헤더 카드·같은 날 경기 스트립·탭 줄·탭 본문을 세로로 두고, 우측
 * 컬럼에 채팅 패널을 늘 띄운다. 예전엔 요약·라인업·스탯을 한 지면에 다 펼쳐
 * 세로가 너무 길었고 채팅은 "경기/채팅" 탭 뒤에 숨어 있었다. GNB는 쿼리 상태와
 * 무관하게 항상 그린다. lg 아래에서는 우측 컬럼이 본문 아래로 내려간다.
 *
 * @param matchId API-Football fixture id
 * @param initial 서버가 받아 둔 상세 씨앗. 없으면 클라가 직접 받는다
 */
export function MatchDetailScreen({
  matchId,
  initial,
}: {
  matchId: number;
  initial?: InitialMatchDetail;
}) {
  const {
    data: detail,
    isPending,
    isError,
    refetch,
  } = useMatchDetail(matchId, initial);

  return (
    <>
      <SiteHeader />
      <main>
        <PageContainer className="pt-6 pb-22">
          {isPending ? (
            <HeaderSkeleton />
          ) : isError ? (
            <LiveLoadError onRetry={() => refetch()} />
          ) : (
            <MatchDetailBody detail={detail} />
          )}
        </PageContainer>
      </main>
    </>
  );
}

/**
 * 상태로 좌측 본문이 갈린다 — SCHEDULED는 프리뷰(탭 하나라 탭 줄 없이 본문만),
 * LIVE·FINISHED는 요약·라인업·스탯 탭, POSTPONED는 프리뷰가 있으면 프리뷰,
 * 없으면 안내만, CANCELLED는 안내만(`MATCH_TABS_BY_STATUS`). 우측 채팅 패널은
 * 상태와 무관하게 늘 같은 자리에 있어 탭을 바꿔도 리마운트되지 않는다.
 *
 * 탭은 컴포넌트 상태다. 폴링으로 상태가 바뀌어(예정 → 라이브) 지금 탭이
 * 사라지면 첫 탭으로 돌아간다.
 */
function MatchDetailBody({
  detail,
}: {
  detail: NonNullable<ReturnType<typeof useMatchDetail>["data"]>;
}) {
  const { header } = detail;
  const tabs = MATCH_TABS_BY_STATUS[header.status];
  const [selected, setSelected] = useState<MatchTabKey | null>(null);
  const active =
    selected !== null && tabs.includes(selected) ? selected : tabs[0];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-w-0 flex-col gap-4">
        <MatchHeaderCard header={header} />
        <SameDayMatchesStrip header={header} />
        {active === undefined ? (
          header.status === "POSTPONED" && detail.preview ? (
            <PreviewGrid preview={detail.preview} />
          ) : (
            <p className="bg-elevate rounded-card text-body-lg text-text-4 py-20 text-center">
              {header.status === "POSTPONED"
                ? "경기가 연기됐어요. 새 일정은 추후 공지돼요."
                : "취소된 경기예요."}
            </p>
          )
        ) : (
          <>
            {tabs.length > 1 && (
              <MatchTabBar tabs={tabs} active={active} onSelect={setSelected} />
            )}
            <MatchDetailTabs detail={detail} tab={active} />
          </>
        )}
      </div>
      <MatchChatPanel header={header} />
    </div>
  );
}

/** 헤더 카드 자리 스켈레톤 — 양 팀과 가운데 스코어의 실루엣. */
function HeaderSkeleton() {
  return (
    <section className="bg-elevate rounded-card flex animate-pulse items-center gap-6 px-8 py-8">
      <div className="flex w-40 flex-col items-center gap-3 lg:w-52">
        <div className="bg-elevate-2 size-16 rounded-full" />
        <div className="bg-elevate-2 rounded-control h-5 w-24" />
      </div>
      <div className="flex flex-1 flex-col items-center gap-3">
        <div className="bg-elevate-2 rounded-control h-4 w-28" />
        <div className="bg-elevate-2 rounded-control h-12 w-28" />
      </div>
      <div className="flex w-40 flex-col items-center gap-3 lg:w-52">
        <div className="bg-elevate-2 size-16 rounded-full" />
        <div className="bg-elevate-2 rounded-control h-5 w-24" />
      </div>
    </section>
  );
}

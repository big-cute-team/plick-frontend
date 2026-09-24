"use client";

import Link from "next/link";
import { useState } from "react";
import { CHAT_ENABLED } from "@plick/core/chat";
import type { InitialMatchDetail, StandingRow } from "@plick/domain/live";
import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";
import { MATCH_TABS_BY_STATUS } from "@/_constants/live";
import { useMatchDetail } from "@/_hooks/useMatchDetail";
import { useScreenTabView } from "@/_hooks/useScreenTabView";
import type { MatchTabKey } from "@/_types/live";
import { LiveLoadError } from "./LiveLoadError";
import { MatchChatPanel } from "./MatchChatPanel";
import { MatchDetailTabs } from "./MatchDetailTabs";
import { MatchHeaderCard } from "./MatchHeaderCard";
import { MatchTabBar } from "./MatchTabBar";
import { PreviewGrid } from "./PreviewGrid";
import { SiteFooter } from "@/_components/SiteFooter";

/**
 * 경기 상세 화면 본체 (KAN-452 → KAN-462 → KAN-567 시안 경기 상세 819-1062행).
 * 빵부스러기("LIVE" / 대회명), 스코어 헤더, 그 아래 `minmax(0,1fr) 300px` 그리드에
 * 탭 줄과 탭 본문, 우측 채팅 aside를 둔다. GNB는 쿼리 상태와 무관하게 항상 그린다.
 * 시안에 없는 같은 날 경기 스트립은 지웠다.
 *
 * @param matchId API-Football fixture id
 * @param initial 서버가 받아 둔 상세 씨앗. 없으면 클라가 직접 받는다
 * @param standings 순위 탭의 표. 서버가 못 받았으면 null
 */
export function MatchDetailScreen({
  matchId,
  initial,
  standings,
}: {
  matchId: number;
  initial?: InitialMatchDetail;
  standings: StandingRow[] | null;
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
        <PageContainer className="pt-5.5 pb-12">
          <nav aria-label="경로" className="flex items-center gap-1.75 pb-5">
            <Link
              href="/live"
              className="text-label text-accent hover:text-accent-hover font-bold"
            >
              LIVE
            </Link>
            <span aria-hidden className="text-caption text-text-4">
              /
            </span>
            <span className="text-label text-text-3">
              {detail?.header.competition ?? "경기"}
            </span>
          </nav>
          {isPending ? (
            <HeaderSkeleton />
          ) : isError ? (
            <LiveLoadError onRetry={() => refetch()} />
          ) : (
            <MatchDetailBody detail={detail} standings={standings} />
          )}
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}

/**
 * 상태로 좌측 본문이 갈린다. SCHEDULED는 프리뷰, 순위, 뉴스, LIVE·FINISHED는
 * 요약, 라인업, 스탯, 순위, 뉴스, POSTPONED는 프리뷰가 있으면 프리뷰, 없으면 안내만,
 * CANCELLED는 안내만(`MATCH_TABS_BY_STATUS`). 우측 채팅 aside는 상태와 무관하게
 * 늘 같은 자리에 있어 탭을 바꿔도 리마운트되지 않는다.
 *
 * 채팅이 닫혀 있는 동안(`CHAT_ENABLED`, KAN-486)은 우측 컬럼을 아예 만들지
 * 않고 본문이 한 컬럼을 다 쓴다. 빈 300px 컬럼이 남지 않게 한다.
 *
 * 탭은 컴포넌트 상태다. 폴링으로 상태가 바뀌어(예정 → 라이브) 지금 탭이
 * 사라지면 첫 탭으로 돌아간다.
 */
function MatchDetailBody({
  detail,
  standings,
}: {
  detail: NonNullable<ReturnType<typeof useMatchDetail>["data"]>;
  standings: StandingRow[] | null;
}) {
  const { header } = detail;
  const tabs = MATCH_TABS_BY_STATUS[header.status];
  const [selected, setSelected] = useState<MatchTabKey | null>(null);
  const active =
    selected !== null && tabs.includes(selected) ? selected : tabs[0];
  /* 탭 전환은 캐시라 서버 요청이 없어 여기서 화면 전환으로 센다 (KAN-543) */
  useScreenTabView("match_detail", active, header.id);

  return (
    <>
      <MatchHeaderCard header={header} />
      <div
        className={`grid grid-cols-1 gap-8 pt-5.5 ${
          CHAT_ENABLED ? "lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10" : ""
        }`}
      >
        <div className="min-w-0">
          {active === undefined ? (
            header.status === "POSTPONED" && detail.preview ? (
              <PreviewGrid preview={detail.preview} />
            ) : (
              <p className="text-body-md text-text-4 py-10">
                {header.status === "POSTPONED"
                  ? "경기가 연기됐어요. 새 일정은 추후 공지돼요"
                  : "취소된 경기예요"}
              </p>
            )
          ) : (
            <>
              <MatchTabBar tabs={tabs} active={active} onSelect={setSelected} />
              <MatchDetailTabs
                detail={detail}
                tab={active}
                standings={standings}
              />
            </>
          )}
        </div>
        {CHAT_ENABLED && (
          <aside>
            <MatchChatPanel header={header} />
          </aside>
        )}
      </div>
    </>
  );
}

/** 스코어 헤더 자리 스켈레톤 — 양 팀 엠블럼 72와 가운데 스코어의 실루엣. */
function HeaderSkeleton() {
  return (
    <div className="border-border flex animate-pulse items-center gap-6.5 border-b pb-6.5">
      <div className="flex flex-1 flex-col items-center gap-2.75">
        <div className="bg-chip size-18 rounded-full" />
        <div className="bg-chip h-4 w-24" />
      </div>
      <div className="flex min-w-52.5 flex-col items-center gap-2.25">
        <div className="bg-chip h-3.5 w-28" />
        <div className="bg-chip h-11.5 w-32" />
      </div>
      <div className="flex flex-1 flex-col items-center gap-2.75">
        <div className="bg-chip size-18 rounded-full" />
        <div className="bg-chip h-4 w-24" />
      </div>
    </div>
  );
}

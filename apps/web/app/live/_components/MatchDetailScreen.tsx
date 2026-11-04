"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CHAT_ENABLED } from "@plick/core/chat";
import type { InitialMatchDetail, StandingRow } from "@plick/domain/live";
import {
  PREDICTION_TAB_QUERY,
  PREDICTION_TAB_VALUE,
  type PredictionSummary,
} from "@plick/domain/prediction";
import { LiveChatPanel } from "@/_components/LiveChatPanel";
import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";
import { matchTabsFor } from "@/_constants/live";
import { useMatchDetail } from "@/_hooks/useMatchDetail";
import { usePredictionSummary } from "@plick/core/prediction-queries";
import { useScreenTabView } from "@/_hooks/useScreenTabView";
import type { MatchTabKey } from "@/_types/live";
import { LiveLoadError } from "./LiveLoadError";
import { MatchDetailTabs } from "./MatchDetailTabs";
import { MatchHeaderCard } from "./MatchHeaderCard";
import { MatchTabBar } from "./MatchTabBar";
import { TabPanel } from "@/_components/TabPanel";
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
 * @param prediction 예측 요약 씨앗 (KAN-696). null은 예측 없는 경기, undefined는 서버가 못 받은 것
 */
export function MatchDetailScreen({
  matchId,
  initial,
  standings,
  prediction,
}: {
  matchId: number;
  initial?: InitialMatchDetail;
  standings: StandingRow[] | null;
  prediction?: PredictionSummary | null;
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
            <MatchDetailBody
              detail={detail}
              standings={standings}
              prediction={prediction}
            />
          )}
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}

/**
 * 상태로 좌측 본문이 갈린다. SCHEDULED는 (요약이 있으면 예측) 프리뷰, 순위, 뉴스, LIVE·FINISHED는
 * (요약이 있으면 예측) 요약, 라인업, 스탯, 순위, 뉴스, POSTPONED는 프리뷰가 있으면
 * 프리뷰, 없으면 안내만, CANCELLED는 안내만(`MATCH_TABS_BY_STATUS`). 우측 채팅 aside는 상태와 무관하게
 * 늘 같은 자리에 있어 탭을 바꿔도 리마운트되지 않는다. 방은 경기별이 아니라 홈
 * 레일과 같은 통합 방이다(KAN-572).
 *
 * 채팅이 닫혀 있는 동안(`CHAT_ENABLED`, KAN-486)은 우측 컬럼을 아예 만들지
 * 않고 본문이 한 컬럼을 다 쓴다. 빈 300px 컬럼이 남지 않게 한다.
 *
 * 탭은 컴포넌트 상태다. 폴링으로 상태가 바뀌어(예정 → 라이브) 지금 탭이
 * 사라지면 첫 탭으로 돌아간다.
 *
 * 예측 탭(KAN-696)은 요약 쿼리가 값을 줄 때만 맨 앞에 선다. 빅6 밖 경기는 요약이 404라 null이고
 * 탭이 없다. 내 예측이 실리는 유저별 지면이라 뉴스처럼 열 때만 그린다. 숨겨 둔 채 그리면 바 등장
 * 애니메이션이 안 보이는 사이에 끝난다. 프리뷰 탭(KAN-729에서 예측과 다시 갈랐다)은 예정 경기면
 * 요약과 무관하게 늘 있고 다른 내용 탭처럼 숨긴 채 그려 팀 비교, 결장자가 서버 HTML에 실린다.
 */
function MatchDetailBody({
  detail,
  standings,
  prediction: predictionSeed,
}: {
  detail: NonNullable<ReturnType<typeof useMatchDetail>["data"]>;
  standings: StandingRow[] | null;
  prediction?: PredictionSummary | null;
}) {
  const { header } = detail;
  const { data: prediction = null } = usePredictionSummary(
    header.id,
    predictionSeed,
  );
  const tabs = matchTabsFor(header.status, prediction !== null);
  const [selected, setSelected] = useState<MatchTabKey | null>(null);
  /* 홈 카드 같은 진입점이 `?tab=prediction`으로 보내면 예측 탭을 먼저 연다 (KAN-700). 페이지가 익명
     ISR이라 서버에서 쿼리를 읽을 수 없고, `useSearchParams`는 정적 라우트에서 Suspense 경계까지 클라
     렌더로 돌려 서버 HTML의 탭 본문(KAN-683)을 잃는다. 마운트 뒤 주소에서 직접 읽는다. 요약이 아직
     안 와 탭이 없으면 `active`가 첫 탭으로 접히고 탭이 생기는 순간 넘어간다 */
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get(
      PREDICTION_TAB_QUERY,
    );
    if (tab === PREDICTION_TAB_VALUE) setSelected("prediction");
  }, []);
  const active =
    selected !== null && tabs.includes(selected) ? selected : tabs[0];
  /* 탭 전환은 캐시라 서버 요청이 없어 여기서 화면 전환으로 센다 (KAN-543) */
  useScreenTabView("match_detail", active, header.id);

  return (
    <>
      <MatchHeaderCard header={header} />
      <div
        className={`grid grid-cols-1 gap-8 pt-4 ${
          CHAT_ENABLED ? "lg:grid-cols-[minmax(0,1fr)_18.75rem] lg:gap-10" : ""
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
              {/* 내용 탭은 전부 그리고 비활성은 hidden (KAN-683). 라인업·스탯·순위가 서버 HTML에
                  실린다. 뉴스 탭만 열 때 그린다. 열리면 클라에서 받는 목록이라 숨겨 두면 모두에게
                  요청이 나간다 */}
              {tabs.map((tab) =>
                tab === "news" || tab === "prediction" ? (
                  active === tab && (
                    <TabPanel
                      key={tab}
                      on
                      id={`match-panel-${tab}`}
                      labelledBy={`match-tab-${tab}`}
                    >
                      <MatchDetailTabs
                        detail={detail}
                        tab={tab}
                        standings={standings}
                        prediction={prediction}
                      />
                    </TabPanel>
                  )
                ) : (
                  <TabPanel
                    key={tab}
                    on={active === tab}
                    id={`match-panel-${tab}`}
                    labelledBy={`match-tab-${tab}`}
                  >
                    <MatchDetailTabs
                      detail={detail}
                      tab={tab}
                      standings={standings}
                      prediction={prediction}
                    />
                  </TabPanel>
                ),
              )}
            </>
          )}
        </div>
        {CHAT_ENABLED && (
          <aside>
            <LiveChatPanel />
          </aside>
        )}
      </div>
    </>
  );
}

/** 스코어 헤더 자리 스켈레톤. 한 줄 헤더(`MatchHeaderCard`, KAN-709)와 같은 높이로 엠블럼 44와 스코어 실루엣. */
function HeaderSkeleton() {
  return (
    <div className="border-border flex animate-pulse items-center gap-4 border-b pb-4 lg:gap-6.5">
      <div className="flex flex-1 items-center justify-end gap-2.5">
        <div className="bg-chip h-4 w-24" />
        <div className="bg-chip size-11 rounded-full" />
      </div>
      <div className="flex min-w-40 flex-col items-center gap-2">
        <div className="bg-chip h-6 w-20" />
        <div className="bg-chip h-3 w-28" />
      </div>
      <div className="flex flex-1 items-center gap-2.5">
        <div className="bg-chip size-11 rounded-full" />
        <div className="bg-chip h-4 w-24" />
      </div>
    </div>
  );
}

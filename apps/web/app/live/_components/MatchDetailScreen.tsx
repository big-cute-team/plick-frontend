"use client";

import { useState } from "react";
import type { InitialMatchDetail } from "@plick/domain/live";
import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";
import { MATCH_VIEWS_BY_STATUS } from "@/_constants/live";
import { useMatchDetail } from "@/_hooks/useMatchDetail";
import type { MatchView } from "@/_types/live";
import { GoalsCard } from "./GoalsCard";
import { LineupCard } from "./LineupCard";
import { LiveLoadError } from "./LiveLoadError";
import { MatchChatPanel } from "./MatchChatPanel";
import { MatchHeaderCard } from "./MatchHeaderCard";
import { MatchViewTabs } from "./MatchViewTabs";
import { PreviewGrid } from "./PreviewGrid";
import { StatsRail } from "./StatsRail";
import { TimelineCard } from "./TimelineCard";

/**
 * 경기 상세 화면 본체 (KAN-452) — 데스크톱은 모바일의 내부 탭 대신 지면을
 * 넓게 써서 요약·라인업(좌)과 스탯(우 레일)을 한 번에 노출한다. SCHEDULED는
 * 프리뷰 2컬럼, POSTPONED는 프리뷰가 있으면 프리뷰, CANCELLED는 헤더와
 * 안내만. 블록별 null 조건부 렌더가 기본이다(서버가 조각 실패 시 그 조각만
 * 빼고 내리는 구조). GNB는 쿼리 상태와 무관하게 항상 그린다.
 *
 * 채팅(KAN-458)은 헤더 카드 아래 "경기 / 채팅" 탭으로 갈린다. 연기·취소는
 * 방이 열리지 않아 탭 없이 안내만 그린다(`MATCH_VIEWS_BY_STATUS`).
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

function MatchDetailBody({
  detail,
}: {
  detail: NonNullable<ReturnType<typeof useMatchDetail>["data"]>;
}) {
  const { header } = detail;
  const views = MATCH_VIEWS_BY_STATUS[header.status];
  const [selected, setSelected] = useState<MatchView | null>(null);
  const active =
    selected !== null && views.includes(selected) ? selected : views[0];

  return (
    <>
      <MatchHeaderCard header={header} />
      {active !== undefined && (
        <MatchViewTabs views={views} active={active} onSelect={setSelected} />
      )}
      {active === "chat" ? (
        <MatchChatPanel header={header} />
      ) : (header.status === "SCHEDULED" || header.status === "POSTPONED") &&
        detail.preview ? (
        <PreviewGrid preview={detail.preview} />
      ) : header.status === "POSTPONED" || header.status === "CANCELLED" ? (
        <p className="text-body text-text-4 py-20 text-center">
          {header.status === "POSTPONED"
            ? "경기가 연기됐어요. 새 일정은 추후 공지돼요."
            : "취소된 경기예요."}
        </p>
      ) : header.status === "SCHEDULED" ? (
        <p className="text-body text-text-4 py-20 text-center">
          프리뷰 정보가 아직 없어요
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 pt-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-3">
            {detail.events ? (
              <>
                <GoalsCard goals={detail.goals} />
                <TimelineCard header={header} events={detail.events} />
              </>
            ) : (
              <p className="text-body text-text-4 py-10 text-center">
                요약 정보가 아직 없어요
              </p>
            )}
            {detail.lineups ? (
              <LineupCard
                matchId={header.id}
                live={header.status === "LIVE"}
                home={detail.lineups.home}
                away={detail.lineups.away}
              />
            ) : (
              <p className="text-body text-text-4 py-6 text-center">
                라인업은 킥오프 20~40분 전에 공개돼요
              </p>
            )}
          </div>
          {detail.stats ? (
            <StatsRail stats={detail.stats} status={header.status} />
          ) : (
            <p className="text-body text-text-4 py-10 text-center">
              스탯 정보가 아직 없어요
            </p>
          )}
        </div>
      )}
    </>
  );
}

/** 헤더 카드 자리 스켈레톤 — 양 팀과 가운데 스코어의 실루엣. */
function HeaderSkeleton() {
  return (
    <section className="bg-elevate rounded-card flex animate-pulse items-center gap-4 px-6 py-5 lg:px-8">
      <div className="flex w-32 items-center gap-3 lg:w-44">
        <div className="bg-elevate-2 size-9 rounded-full" />
        <div className="bg-elevate-2 rounded-control h-4 w-20" />
      </div>
      <div className="flex flex-1 flex-col items-center gap-2">
        <div className="bg-elevate-2 rounded-control h-3.5 w-24" />
        <div className="bg-elevate-2 rounded-control h-9 w-20" />
      </div>
      <div className="flex w-32 flex-row-reverse items-center gap-3 lg:w-44">
        <div className="bg-elevate-2 size-9 rounded-full" />
        <div className="bg-elevate-2 rounded-control h-4 w-20" />
      </div>
    </section>
  );
}

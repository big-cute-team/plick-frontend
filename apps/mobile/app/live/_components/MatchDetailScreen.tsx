"use client";

import type { InitialMatchDetail } from "@plick/domain/live";
import { AppShell } from "@/_components/AppShell";
import { QueryBoundary } from "@/_components/QueryBoundary";
import { ScrollArea } from "@/_components/ScrollArea";
import { useMatchDetail } from "@/_hooks/useMatchDetail";
import { LiveLoadError } from "./LiveLoadError";
import { MatchDetailTabs } from "./MatchDetailTabs";
import { MatchHeaderBlock } from "./MatchHeaderBlock";
import { MatchTopBar } from "./MatchTopBar";
import { PreviewBlocks } from "./PreviewBlocks";

/**
 * 경기 상세 화면 본체 (KAN-452) — 경계를 세우고 본문은 {@link MatchDetailBody}가
 * 그린다. 상단바 제목이 상세 응답(대회명)에서 오므로 상단바까지 경계 안이다.
 * 씨앗이 없어 받는 동안은 상단바 자리 + 헤더 스켈레톤, 실패는 에러 지면.
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
  return (
    <AppShell>
      <QueryBoundary
        fallback={
          <>
            <MatchTopBar title="경기" />
            <HeaderSkeleton />
          </>
        }
        errorFallback={(retry) => (
          <>
            <MatchTopBar title="경기" />
            <LiveLoadError onRetry={retry} />
          </>
        )}
      >
        <MatchDetailBody matchId={matchId} initial={initial} />
      </QueryBoundary>
    </AppShell>
  );
}

/**
 * 상태로 지면이 갈린다 — SCHEDULED는 프리뷰 블록, LIVE·FINISHED는
 * 요약·라인업·스탯 탭, POSTPONED는 프리뷰가 있으면 프리뷰, 없으면 안내만,
 * CANCELLED는 헤더와 안내만.
 */
function MatchDetailBody({
  matchId,
  initial,
}: {
  matchId: number;
  initial?: InitialMatchDetail;
}) {
  const { data: detail } = useMatchDetail(matchId, initial);
  const { header } = detail;
  const notPlayed =
    header.status === "SCHEDULED" || header.status === "POSTPONED";

  return (
    <>
      <MatchTopBar title={header.competition} />
      <ScrollArea>
        <MatchHeaderBlock header={header} />
        {notPlayed && detail.preview ? (
          <PreviewBlocks preview={detail.preview} />
        ) : header.status === "POSTPONED" || header.status === "CANCELLED" ? (
          <p className="text-body text-text-4 px-edge py-16 text-center">
            {header.status === "POSTPONED"
              ? "경기가 연기됐어요. 새 일정은 추후 공지돼요."
              : "취소된 경기예요."}
          </p>
        ) : header.status === "SCHEDULED" ? (
          <p className="text-body text-text-4 px-edge py-16 text-center">
            프리뷰 정보가 아직 없어요
          </p>
        ) : (
          <MatchDetailTabs detail={detail} />
        )}
      </ScrollArea>
    </>
  );
}

/** 헤더 자리 스켈레톤 — 크레스트 둘과 가운데 스코어의 실루엣. */
function HeaderSkeleton() {
  return (
    <div className="px-edge flex animate-pulse items-start justify-between gap-3 pt-5 pb-4">
      <div className="flex w-24 flex-col items-center gap-2">
        <div className="bg-elevate size-12 rounded-full" />
        <div className="bg-elevate rounded-control h-3.5 w-16" />
      </div>
      <div className="bg-elevate rounded-control mt-2 h-8 w-20" />
      <div className="flex w-24 flex-col items-center gap-2">
        <div className="bg-elevate size-12 rounded-full" />
        <div className="bg-elevate rounded-control h-3.5 w-16" />
      </div>
    </div>
  );
}

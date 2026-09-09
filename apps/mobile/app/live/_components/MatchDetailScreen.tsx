"use client";

import { useState } from "react";
import type { InitialMatchDetail } from "@plick/domain/live";
import { AppShell } from "@/_components/AppShell";
import { QueryBoundary } from "@/_components/QueryBoundary";
import { ScrollArea } from "@/_components/ScrollArea";
import { MATCH_TABS_BY_STATUS } from "@/_constants/live";
import { useMatchDetail } from "@/_hooks/useMatchDetail";
import type { MatchTabKey } from "@/_types/live";
import { LiveLoadError } from "./LiveLoadError";
import { MatchChatPanel } from "./MatchChatPanel";
import { MatchDetailTabs } from "./MatchDetailTabs";
import { MatchHeaderBlock } from "./MatchHeaderBlock";
import { MatchTabBar } from "./MatchTabBar";
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
        name="MatchDetail"
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
 * 상태로 지면이 갈린다 — SCHEDULED는 프리뷰·채팅 탭, LIVE·FINISHED는
 * 요약·라인업·스탯·채팅 탭, POSTPONED는 프리뷰가 있으면 프리뷰, 없으면 안내만,
 * CANCELLED는 헤더와 안내만(`MATCH_TABS_BY_STATUS`).
 *
 * 채팅 탭만 스크롤 영역 밖에 선다 (KAN-458). 입력바가 화면 하단에 붙어 있어야
 * 하는데 `AppShell`이 높이를 못박고 스크롤은 `ScrollArea`가 맡는 구조라, 스크롤
 * 안에 두면 입력바가 목록과 함께 흘러가 버린다. 그래서 채팅일 때는 헤더·탭 줄을
 * 고정하고 남는 높이를 채팅 패널이 다 가져간다(목록만 안에서 스크롤).
 *
 * 탭은 컴포넌트 상태다. 폴링으로 상태가 바뀌어(예정 → 라이브) 지금 탭이 사라지면
 * 첫 탭으로 돌아간다.
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
  const tabs = MATCH_TABS_BY_STATUS[header.status];
  const [selected, setSelected] = useState<MatchTabKey | null>(null);
  const active =
    selected !== null && tabs.includes(selected) ? selected : tabs[0];

  if (active === "chat") {
    return (
      <>
        <MatchTopBar title={header.competition} />
        <div className="flex min-h-0 flex-1 flex-col">
          <MatchHeaderBlock header={header} />
          <MatchTabBar tabs={tabs} active={active} onSelect={setSelected} />
          <MatchChatPanel header={header} />
        </div>
      </>
    );
  }

  return (
    <>
      <MatchTopBar title={header.competition} />
      <ScrollArea>
        <MatchHeaderBlock header={header} />
        {active === undefined ? (
          header.status === "POSTPONED" && detail.preview ? (
            <PreviewBlocks preview={detail.preview} />
          ) : (
            <p className="text-body text-text-4 px-edge py-16 text-center">
              {header.status === "POSTPONED"
                ? "경기가 연기됐어요. 새 일정은 추후 공지돼요."
                : "취소된 경기예요."}
            </p>
          )
        ) : (
          <>
            <MatchTabBar tabs={tabs} active={active} onSelect={setSelected} />
            <MatchDetailTabs detail={detail} tab={active} />
          </>
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

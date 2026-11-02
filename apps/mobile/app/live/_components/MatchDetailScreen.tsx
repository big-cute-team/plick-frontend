"use client";

import { useEffect, useState } from "react";
import type { InitialMatchDetail, StandingRow } from "@plick/domain/live";
import {
  PREDICTION_TAB_QUERY,
  PREDICTION_TAB_VALUE,
  type KeyPlayers,
  type PredictionSummary,
} from "@plick/domain/prediction";
import { AppShell } from "@/_components/AppShell";
import { QueryBoundary } from "@/_components/QueryBoundary";
import { ScrollArea } from "@/_components/ScrollArea";
import { SubTopBar } from "@/_components/SubTopBar";
import { SwipePager } from "@/_components/SwipePager";
import { matchTabsFor } from "@/_constants/live";
import { useMatchDetail } from "@/_hooks/useMatchDetail";
import { useMatchDetailRefresh } from "@/_hooks/useMatchDetailRefresh";
import { usePredictionSummary } from "@plick/core/prediction-queries";
import { useScreenTabView } from "@/_hooks/useScreenTabView";
import type { MatchTabKey } from "@/_types/live";
import { LiveChatPanel } from "./LiveChatPanel";
import { LiveChatPreview } from "./LiveChatPreview";
import { LiveLoadError } from "./LiveLoadError";
import { MatchDetailTabs } from "./MatchDetailTabs";
import { MatchHeaderBlock } from "./MatchHeaderBlock";
import { MatchTabBar } from "./MatchTabBar";
import { PreviewBlocks } from "./PreviewBlocks";

/**
 * 경기 상세 화면 본체 (KAN-452). 경계를 세우고 본문은 {@link MatchDetailBody}가
 * 그린다. 상단바 제목이 상세 응답(대회명)에서 오므로 상단바까지 경계 안이다.
 * 씨앗이 없어 받는 동안은 상단바 자리 + 헤더 스켈레톤, 실패는 에러 지면.
 *
 * @param matchId API-Football fixture id
 * @param initial 서버가 받아 둔 상세 씨앗. 없으면 클라가 직접 받는다
 * @param standings 순위 탭에 깔 순위표. 서버가 못 받았으면 null
 * @param prediction 예측 요약 씨앗 (KAN-696). null은 예측 없는 경기, undefined는 서버가 못 받은 것
 * @param keyPlayers 키플레이어 씨앗 (KAN-699). 프리뷰 탭이 쓴다. null과 undefined의 뜻은 예측 요약과 같다
 */
export function MatchDetailScreen({
  matchId,
  initial,
  standings,
  prediction,
  keyPlayers,
}: {
  matchId: number;
  initial?: InitialMatchDetail;
  standings: StandingRow[] | null;
  prediction?: PredictionSummary | null;
  keyPlayers?: KeyPlayers | null;
}) {
  return (
    <AppShell>
      <QueryBoundary
        name="MatchDetail"
        fallback={
          <>
            <SubTopBar title="경기" backHref="/live" backBehavior="back" />
            <HeaderSkeleton />
          </>
        }
        errorFallback={(retry) => (
          <>
            <SubTopBar title="경기" backHref="/live" backBehavior="back" />
            <LiveLoadError onRetry={retry} />
          </>
        )}
      >
        <MatchDetailBody
          matchId={matchId}
          initial={initial}
          standings={standings}
          prediction={prediction}
          keyPlayers={keyPlayers}
        />
      </QueryBoundary>
    </AppShell>
  );
}

/**
 * 상태로 지면이 갈린다. SCHEDULED는 채팅·프리뷰·순위·뉴스, LIVE·FINISHED는
 * 채팅·요약·라인업·스탯·순위·뉴스, POSTPONED는 프리뷰가 있으면 프리뷰, 없으면
 * 안내만, CANCELLED는 헤더와 안내만(`MATCH_TABS_BY_STATUS`). 채팅이 닫혀 있는
 * 동안은 `matchTabsFor`가 채팅 탭을 빼 주고(KAN-486), 탭이 하나만 남으면 웹처럼
 * 탭 줄 없이 본문만 그린다.
 *
 * 스코어 헤더와 탭 줄은 상단에 고정이다 (시안 KAN-567). 그 아래만 스크롤한다.
 * 전에는 채팅 탭만 헤더를 고정하고 나머지 탭은 헤더째 흘러갔는데, 시안이
 * "스코어를 보면서 채팅한다"는 규칙을 모든 탭에 같게 두므로 헤더·탭 줄을 스크롤
 * 영역 밖으로 뺐다. 채팅 탭은 스크롤 영역 대신 남는 높이를 채팅 패널이 다 가져가
 * 입력바가 화면 하단에 붙는다(KAN-458, 목록만 안에서 스크롤). `AppShell`이 높이를
 * 못박고 스크롤은 `ScrollArea`가 맡는 구조라, 스크롤 안에 두면 입력바가 목록과
 * 함께 흘러가 버린다.
 *
 * 탭은 컴포넌트 상태다. 폴링으로 상태가 바뀌어(예정 → 라이브) 지금 탭이 사라지면
 * 첫 탭으로 돌아간다. 예측 가능한 경기는 예측이 기본 탭이다.
 *
 * 예측 탭(KAN-696)은 요약 쿼리가 값을 줄 때만 맨 앞에 선다. 빅6 밖 경기는 404라 null이고
 * 탭이 없다. 서버 씨앗이 없고 아직 받는 중이면 탭이 잠깐 없다가 응답 뒤에 붙는다.
 *
 * 본문을 좌우로 끌면 이웃 탭으로 넘어간다 (KAN-462, `SwipePager`). 커밋은 탭을
 * 누른 것과 같은 `setSelected`다. 페이저는 두 레이아웃(채팅 고정 / 스크롤)에
 * 각각 하나씩이라 채팅 경계를 넘는 커밋에서는 옛 페이저가 내려가고 새 페이저가
 * 제자리(transform 없음)로 올라온다. 스냅이 끝난 자리에 미리보기가 있었으므로
 * 그대로 진짜 페인으로 갈아 끼워지는 셈이다. 채팅 이웃의 미리보기는 소켓을
 * 열지 않는 자리 표시(`LiveChatPreview`)다.
 */
function MatchDetailBody({
  matchId,
  initial,
  standings,
  prediction: predictionSeed,
  keyPlayers,
}: {
  matchId: number;
  initial?: InitialMatchDetail;
  standings: StandingRow[] | null;
  prediction?: PredictionSummary | null;
  keyPlayers?: KeyPlayers | null;
}) {
  const { data: detail } = useMatchDetail(matchId, initial);
  const { data: prediction = null } = usePredictionSummary(
    matchId,
    predictionSeed,
  );
  /* 당겨서 새로고침 (KAN-681). 채팅 탭은 스크롤 영역이 아니라 대상이 아니다 */
  const refresh = useMatchDetailRefresh(matchId);
  const { header } = detail;
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
  useScreenTabView("match_detail", active, matchId);

  const neighborTab = (tab: MatchTabKey, dir: 1 | -1) =>
    tabs[tabs.indexOf(tab) + dir] ?? null;
  const renderPreview = (tab: MatchTabKey) =>
    tab === "chat" ? (
      <LiveChatPreview />
    ) : (
      <MatchDetailTabs
        detail={detail}
        tab={tab}
        standings={standings}
        prediction={prediction}
        keyPlayers={keyPlayers}
        onSelectTab={setSelected}
      />
    );

  return (
    <>
      <SubTopBar
        title={header.competition}
        backHref="/live"
        backBehavior="back"
      />
      <MatchHeaderBlock header={header} />
      {active === undefined ? (
        <ScrollArea onRefresh={refresh}>
          {header.status === "POSTPONED" && detail.preview ? (
            <PreviewBlocks preview={detail.preview} />
          ) : (
            <p className="text-body text-text-4 px-edge py-16 text-center">
              {header.status === "POSTPONED"
                ? "경기가 연기됐어요. 새 일정은 추후 공지돼요"
                : "취소된 경기예요"}
            </p>
          )}
        </ScrollArea>
      ) : (
        <>
          {tabs.length > 1 && (
            <MatchTabBar tabs={tabs} active={active} onSelect={setSelected} />
          )}
          {active === "chat" ? (
            <SwipePager
              value={active}
              neighborOf={neighborTab}
              onCommit={setSelected}
              renderPreview={renderPreview}
              className="flex min-h-0 flex-1 flex-col"
              trackClassName="flex min-h-0 flex-1 flex-col"
            >
              <LiveChatPanel />
            </SwipePager>
          ) : (
            <ScrollArea onRefresh={refresh}>
              <SwipePager
                value={active}
                neighborOf={neighborTab}
                onCommit={setSelected}
                renderPreview={renderPreview}
              >
                <MatchDetailTabs
                  detail={detail}
                  tab={active}
                  standings={standings}
                  prediction={prediction}
                  keyPlayers={keyPlayers}
                  onSelectTab={setSelected}
                />
              </SwipePager>
            </ScrollArea>
          )}
        </>
      )}
    </>
  );
}

/** 헤더 자리 스켈레톤. 엠블럼 둘과 가운데 스코어의 실루엣(시안 크기 56, 38). */
function HeaderSkeleton() {
  return (
    <div className="px-edge flex animate-pulse items-center justify-between gap-2 pt-5.5 pb-4.5">
      <div className="flex flex-1 flex-col items-center gap-2.25">
        <div className="bg-avatar size-14 rounded-full" />
        <div className="bg-elevate rounded-badge h-3.5 w-14" />
      </div>
      <div className="flex w-33 flex-col items-center gap-1.75">
        <div className="bg-elevate rounded-badge h-2.5 w-20" />
        <div className="bg-elevate rounded-badge h-9 w-24" />
        <div className="bg-elevate rounded-badge h-3 w-12" />
      </div>
      <div className="flex flex-1 flex-col items-center gap-2.25">
        <div className="bg-avatar size-14 rounded-full" />
        <div className="bg-elevate rounded-badge h-3.5 w-14" />
      </div>
    </div>
  );
}

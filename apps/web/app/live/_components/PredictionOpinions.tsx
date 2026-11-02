"use client";

import { useState } from "react";
import {
  formatPredictionRecord,
  PREDICTION_OPINION_SORTS,
  predictionFilterPicks,
  predictionOpinionsEmptyText,
  predictionPickLabel,
  type MyPrediction,
  type PredictionOpinionSort,
  type PredictionPick,
  type PredictionSummary,
} from "@plick/domain/prediction";
import { PREDICTION_VOTE_LABEL } from "@/_constants/predictions";
import { useInfiniteScroll } from "@/_hooks/useInfiniteScroll";
import { usePredictionOpinions } from "@plick/core/prediction-queries";
import { PredictionLockedList } from "./PredictionLockedList";
import { PredictionMineBox } from "./PredictionMineBox";
import { PredictionOpinionRow } from "./PredictionOpinionRow";

/** 머리글 줄의 글자 선택지(픽 필터, 정렬) 공통. 13px, 켜지면 700 강조색 */
function chipClass(on: boolean): string {
  return `text-body focus-visible:outline-accent whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
    on
      ? "text-accent font-bold"
      : "text-text-3 hover:text-text-strong font-medium"
  }`;
}

/**
 * 예측 탭의 의견 자리 (KAN-697, 시안 가이드 §5.4, 모바일 `PredictionOpinions`의 웹 판). 머리글
 * 줄(`의견`, 픽 필터, 정렬), 내 예측 상자, 그 아래 의견 행들이다. 머리글 줄은 40px 높이에 밑선이
 * 있고 웹은 정렬 셋을 글자로 나열한다. 픽 필터는 전체, 다른 픽 둘, 내 픽 순이고 예측 전에는
 * 숨긴다. 정렬이나 필터를 바꾸면 쿼리 키가 갈려 커서가 처음부터다.
 *
 * 잠금은 서버가 정한다. 목록 응답의 `locked`가 true면 잠금 지면이고, 아직 응답이 없으면 요약
 * (OPEN에 내 예측 없음)으로 먼저 판단한다. 등록 직후에는 요약은 내 예측이 있는데 옛 목록 캐시가
 * 아직 `locked: true`라 다시 받는 중이다. 그 한순간 잠금 지면이 스치지 않게 그 조건은 받는 중으로
 * 보고 상자만 그린다.
 *
 * 내 예측 상자의 기록(`3전 3적중`)은 요약에 없고 목록 첫 페이지의 `mine`에 실려 온다. 티켓이
 * "`mine`을 첫 페이지 맨 위에 고정"이라 한 자리가 이 상자다.
 *
 * 다음 페이지는 끝 감시 요소가 보이면 받고(`useInfiniteScroll`), 더 받기 실패는 데이터가 있는
 * 실패라 버튼이 재시도 문구로 바뀐다. 첫 페이지 실패는 다시 시도 버튼이다.
 *
 * 의견 행을 누르면 그 아래로 답글이 펼쳐진다(KAN-698). 펼친 의견 id는 여기서 하나만 들어 다른
 * 행을 누르면 먼저 것이 접힌다. 시안의 웹 동선이 그렇다.
 *
 * @param summary 예측 요약. 상태와 내 예측을 본다
 * @param teams 홈·원정 팀명(픽 라벨용)
 * @param onCompose 작성 팝업을 열 때(잠금 지면, 투표하기)
 * @param onEdit 내 예측 수정을 눌렀을 때
 * @param onCancel 내 예측 취소를 눌렀을 때
 */
export function PredictionOpinions({
  summary,
  teams,
  onCompose,
  onEdit,
  onCancel,
}: {
  summary: PredictionSummary;
  teams: { home: string; away: string };
  onCompose: () => void;
  onEdit: () => void;
  onCancel: () => void;
}) {
  const matchId = summary.matchId;
  const mine: MyPrediction | null = summary.myPrediction;
  const open = summary.status === "OPEN";
  const [sort, setSort] = useState<PredictionOpinionSort>("accuracy");
  const [pickFilter, setPickFilter] = useState<PredictionPick | null>(null);
  /* 답글이 펼쳐진 의견. 한 번에 하나만 펼친다(KAN-698). 정렬·필터를 바꿔도 같은 의견이면 그대로 */
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const {
    data,
    isPending,
    isError,
    isFetching,
    isFetchingNextPage,
    isFetchNextPageError,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = usePredictionOpinions(matchId, sort, pickFilter, true);

  const first = data?.pages[0];
  const serverLocked = first?.locked;
  const locked = serverLocked ?? (open && mine === null);
  /* 등록 직후: 요약은 내 예측이 있는데 옛 목록이 아직 잠금이라 다시 받는 중 */
  const refreshing = mine !== null && serverLocked === true && isFetching;
  const items = data?.pages.flatMap((page) => page.items) ?? [];
  const record = first?.mine
    ? formatPredictionRecord(first.mine.author.record)
    : null;

  const sentinelRef = useInfiniteScroll(
    () => fetchNextPage(),
    Boolean(hasNextPage) && !isFetchingNextPage && !isFetchNextPageError,
  );

  return (
    <div className="pb-6">
      <div className="border-border mt-7.5 flex min-h-10 flex-wrap items-center gap-x-3.5 gap-y-1 border-b py-1">
        <h2 className="text-body-lg text-text-strong shrink-0 font-bold">
          의견
        </h2>
        {!locked && (
          <div
            role="group"
            aria-label="픽 필터"
            className="ml-3 flex items-center gap-3.5"
          >
            <button
              type="button"
              aria-pressed={pickFilter === null}
              onClick={() => setPickFilter(null)}
              className={chipClass(pickFilter === null)}
            >
              전체
            </button>
            {predictionFilterPicks(mine?.pick ?? null).map((pick) => (
              <button
                key={pick}
                type="button"
                aria-pressed={pickFilter === pick}
                onClick={() => setPickFilter(pick)}
                className={chipClass(pickFilter === pick)}
              >
                {predictionPickLabel(pick, teams)}
              </button>
            ))}
          </div>
        )}
        <div className="flex-1" />
        {locked ? (
          <button
            type="button"
            onClick={onCompose}
            className="bg-accent text-on-accent text-body hover:bg-accent-hover focus-visible:outline-accent inline-flex h-8 items-center px-3.5 font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {PREDICTION_VOTE_LABEL}
          </button>
        ) : (
          <div
            role="group"
            aria-label="정렬"
            className="flex items-center gap-3.5"
          >
            {PREDICTION_OPINION_SORTS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={sort === value}
                onClick={() => setSort(value)}
                className={chipClass(sort === value)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {mine && !locked && (
        <PredictionMineBox
          mine={mine}
          record={record}
          teams={teams}
          editable={open}
          onEdit={onEdit}
          onCancel={onCancel}
        />
      )}

      {locked && !refreshing ? (
        <PredictionLockedList onCompose={onCompose} />
      ) : isPending || refreshing ? null : isError && items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10">
          <p className="text-body-md text-text-4">의견을 불러오지 못했어요</p>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="border-border-strong text-label-lg text-text-2 hover:text-accent focus-visible:outline-accent h-8.5 border px-4 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
          >
            다시 시도
          </button>
        </div>
      ) : items.length === 0 ? (
        <p className="text-body-md text-text-3 py-11 text-center">
          {predictionOpinionsEmptyText(pickFilter, mine !== null)}
        </p>
      ) : (
        <div className="flex flex-col">
          {items.map((opinion) => (
            <PredictionOpinionRow
              key={opinion.id}
              opinion={opinion}
              matchId={matchId}
              teams={teams}
              myPick={mine?.pick ?? null}
              expanded={expandedId === opinion.id}
              onToggle={() =>
                setExpandedId((id) => (id === opinion.id ? null : opinion.id))
              }
            />
          ))}
          {isFetchNextPageError ? (
            <button
              type="button"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="text-label-lg text-text-3 hover:text-accent focus-visible:outline-accent mt-3.5 h-9 text-center font-bold focus-visible:outline-2 focus-visible:-outline-offset-2 disabled:opacity-40"
            >
              더 불러오지 못했어요, 다시 시도
            </button>
          ) : (
            <div ref={sentinelRef} aria-hidden className="h-px" />
          )}
        </div>
      )}
    </div>
  );
}

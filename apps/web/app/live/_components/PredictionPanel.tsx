"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import type { PredictionFailure } from "@plick/core/prediction-errors";
import type { MatchSummary } from "@plick/domain/live";
import {
  formatPredictionCount,
  predictionStatusLine,
  predictionVerdictLabel,
  type MyPrediction,
  type PredictionSummary,
} from "@plick/domain/prediction";
import { PredictionBar } from "@plick/ui/PredictionBar";
import { useAuth } from "@/_components/AuthProvider";
import { PREDICTION_VOTE_LABEL } from "@/_constants/predictions";
import { PredictionLockedList } from "./PredictionLockedList";
import { PredictionMineBox } from "./PredictionMineBox";
import { PredictionToast } from "./PredictionToast";

/* 팝업 셋은 눌러야 뜨는 조건부 UI라 초기 번들에서 뺀다 (KAN-428과 같은 판단) */
const PredictionComposerDialog = dynamic(
  () =>
    import("./PredictionComposerDialog").then(
      (m) => m.PredictionComposerDialog,
    ),
  { ssr: false },
);
const PredictionAuthDialog = dynamic(
  () => import("./PredictionAuthDialog").then((m) => m.PredictionAuthDialog),
  { ssr: false },
);
const PredictionCancelDialog = dynamic(
  () =>
    import("./PredictionCancelDialog").then((m) => m.PredictionCancelDialog),
  { ssr: false },
);

/** 지금 떠 있는 팝업. 한 번에 하나만 선다. */
type Dialog =
  | { kind: "compose"; mine: MyPrediction | null }
  | { kind: "auth"; mode: "login" | "link" }
  | { kind: "cancel" }
  | null;

/**
 * 경기 상세 예측 탭 본문 (KAN-696, 시안 가이드 §4·§5.4, 모바일 `PredictionTab`의 웹 판). 위에서
 * 아래로 상태 줄(참여 수), 3분할 바(36px), 의견 머리글 줄, 내 예측 상자, 잠금 지면이다.
 *
 * 상태별 표시와 로그인 분기, 마감 409 처리는 모바일과 같다. UPCOMING은 열림 시각만, OPEN 예측
 * 전은 `?%` 바와 잠금 지면, 예측 뒤는 실제 비율과 내 예측 상자(수정, 취소), LOCKED 이후는 읽기
 * 전용이다. 의견 목록과 정렬, 픽 필터는 KAN-697이 머리글 줄에 붙인다. 정산된 경기의 `랭킹 >`
 * 링크는 랭킹 화면(KAN-701)이 생기면 붙인다.
 *
 * 토스트는 웹에 전역 스토어가 없어 이 컴포넌트가 문구와 일련번호를 들고 `PredictionToast`에 넘긴다.
 *
 * @param header 경기 헤더(팀명, 엠블럼)
 * @param summary 예측 요약. 탭이 서 있으면 null이 아니다
 */
export function PredictionPanel({
  header,
  summary,
}: {
  header: MatchSummary;
  summary: PredictionSummary;
}) {
  const { isLoggedIn, isGuest, isSessionPending } = useAuth();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [toast, setToast] = useState<{ message: string | null; seq: number }>({
    message: null,
    seq: 0,
  });
  const clearToast = useCallback(
    () => setToast((t) => ({ ...t, message: null })),
    [],
  );

  const teams = { home: header.home.name, away: header.away.name };
  const mine = summary.myPrediction;
  const open = summary.status === "OPEN";
  const locked = open && mine === null;
  const statusLine = predictionStatusLine(summary, teams);
  const verdict = predictionVerdictLabel(mine?.result);

  /* 고칠 내 예측은 여는 순간의 값을 들고 간다. 열려 있는 동안 요약이 다시 와도 시트가 모드를 바꾸지 않게 */
  function openCompose(editing: boolean) {
    if (!isSessionPending) {
      if (!isLoggedIn) {
        setDialog({ kind: "auth", mode: "login" });
        return;
      }
      if (isGuest) {
        setDialog({ kind: "auth", mode: "link" });
        return;
      }
    }
    setDialog({ kind: "compose", mine: editing ? mine : null });
  }

  function handleFailure(failure: PredictionFailure) {
    switch (failure.kind) {
      case "login":
        setDialog({ kind: "auth", mode: "login" });
        return;
      case "link-account":
        setDialog({ kind: "auth", mode: "link" });
        return;
      default:
        setDialog(null);
        setToast((t) => ({ message: failure.message, seq: t.seq + 1 }));
    }
  }

  return (
    <div className="pt-4.5">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 pb-3">
        {statusLine && (
          <span
            className={`text-body-lg min-w-0 font-bold tabular-nums ${
              summary.status === "LOCKED" || summary.status === "SETTLED"
                ? "text-text-strong"
                : "text-text-3"
            }`}
          >
            {statusLine}
          </span>
        )}
        {verdict && (
          <span
            className={`text-body-md shrink-0 font-bold ${
              verdict === "적중" ? "text-accent" : "text-text-4"
            }`}
          >
            {verdict}
          </span>
        )}
        <div className="flex-1" />
        <span className="text-body text-text-3 shrink-0 whitespace-nowrap tabular-nums">
          {formatPredictionCount(summary.totalCount)}
        </span>
      </div>
      {summary.status !== "UPCOMING" && (
        <PredictionBar
          home={header.home}
          away={header.away}
          distribution={summary.distribution}
          myPick={mine?.pick ?? null}
          totalCount={summary.totalCount}
          size="lg"
        />
      )}

      {summary.status !== "UPCOMING" && (
        <div className="pb-6">
          <div className="border-border mt-7.5 flex h-10 items-center gap-3.5 border-b">
            <h2 className="text-body-lg text-text-strong font-bold">의견</h2>
            <div className="flex-1" />
            {locked && (
              <button
                type="button"
                onClick={() => openCompose(false)}
                className="bg-accent text-on-accent text-body hover:bg-accent-hover focus-visible:outline-accent inline-flex h-8 items-center px-3.5 font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {PREDICTION_VOTE_LABEL}
              </button>
            )}
          </div>
          {mine && (
            <PredictionMineBox
              mine={mine}
              teams={teams}
              editable={open}
              onEdit={() => openCompose(true)}
              onCancel={() => setDialog({ kind: "cancel" })}
            />
          )}
          {locked && (
            <PredictionLockedList onCompose={() => openCompose(false)} />
          )}
        </div>
      )}

      {dialog?.kind === "compose" && (
        <PredictionComposerDialog
          header={header}
          mine={dialog.mine}
          onClose={() => setDialog(null)}
          onFailure={handleFailure}
        />
      )}
      {dialog?.kind === "auth" && (
        <PredictionAuthDialog
          mode={dialog.mode}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "cancel" && (
        <PredictionCancelDialog
          matchId={header.id}
          onClose={() => setDialog(null)}
          onFailure={handleFailure}
        />
      )}
      <PredictionToast
        message={toast.message}
        seq={toast.seq}
        onDone={clearToast}
      />
    </div>
  );
}

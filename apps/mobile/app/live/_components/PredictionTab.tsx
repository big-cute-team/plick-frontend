"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
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
import { PREDICTION_VOTE_LABEL } from "@/_constants/predictions";
import { useAuth } from "@/_components/AuthProvider";
import { useErrorToast } from "@/_stores/error-toast";
import { PredictionLockedList } from "./PredictionLockedList";
import { PredictionMineBox } from "./PredictionMineBox";

/* 시트 셋은 눌러야 뜨는 조건부 UI라 초기 번들에서 뺀다 (KAN-428과 같은 판단) */
const PredictionComposerSheet = dynamic(
  () =>
    import("./PredictionComposerSheet").then((m) => m.PredictionComposerSheet),
  { ssr: false },
);
const PredictionAuthSheet = dynamic(
  () => import("./PredictionAuthSheet").then((m) => m.PredictionAuthSheet),
  { ssr: false },
);
const PredictionCancelSheet = dynamic(
  () => import("./PredictionCancelSheet").then((m) => m.PredictionCancelSheet),
  { ssr: false },
);

/** 지금 떠 있는 시트. 한 번에 하나만 선다. */
type Sheet =
  | { kind: "compose"; mine: MyPrediction | null }
  | { kind: "auth"; mode: "login" | "link" }
  | { kind: "cancel" }
  | null;

/**
 * 경기 상세 예측 탭 (KAN-696, 시안 가이드 §4·§5.4). 위에서 아래로 상태 줄(참여 수), 3분할 바,
 * 의견 머리글, 내 예측 상자, 잠금 지면이다.
 *
 * 상태별로 보이는 것이 다르다(§4 표). UPCOMING은 열림 시각만 보이고 바와 작성, 의견이 없다.
 * OPEN에서 예측 전이면 바는 `?%` 균등이고 의견 자리는 잠금 지면이라 거기서 작성이 열린다. 예측
 * 뒤에는 실제 비율에 내 픽 체크, 내 예측 상자(수정, 취소)가 선다. LOCKED 이후는 바와 상자만 읽기
 * 전용이다. 의견 목록과 정렬, 픽 필터는 KAN-697이 이 자리에 붙인다.
 *
 * 작성 전 로그인 분기(§5.5)는 서버에 보내기 전에 `useAuth`로 먼저 가른다. 세션이 없으면 로그인
 * 시트, 게스트면 연동 안내, 소셜이면 작성 시트다. 세션을 아직 모르는 동안은 작성 시트를 열고 서버
 * 응답(401, 403)이 같은 분기를 다시 탄다. 마감 직전 등록이 409로 돌아오면 토스트 `방금
 * 마감됐어요` 뒤 요약을 다시 받아 LOCKED 화면으로 넘어간다(훅이 무효화, 여기는 토스트).
 *
 * 정산된 경기의 `랭킹 >` 링크는 랭킹 화면(KAN-701)이 생기면 상태 줄에 붙인다.
 *
 * @param header 경기 헤더(팀명, 엠블럼)
 * @param summary 예측 요약. 탭이 서 있으면 null이 아니다
 */
export function PredictionTab({
  header,
  summary,
}: {
  header: MatchSummary;
  summary: PredictionSummary;
}) {
  const { isLoggedIn, isGuest, isSessionPending } = useAuth();
  const showToast = useErrorToast((state) => state.show);
  const [sheet, setSheet] = useState<Sheet>(null);

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
        setSheet({ kind: "auth", mode: "login" });
        return;
      }
      if (isGuest) {
        setSheet({ kind: "auth", mode: "link" });
        return;
      }
    }
    setSheet({ kind: "compose", mine: editing ? mine : null });
  }

  function handleFailure(failure: PredictionFailure) {
    switch (failure.kind) {
      case "login":
        setSheet({ kind: "auth", mode: "login" });
        return;
      case "link-account":
        setSheet({ kind: "auth", mode: "link" });
        return;
      default:
        setSheet(null);
        showToast(failure.message);
    }
  }

  return (
    <>
      <div className="px-edge pt-4">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 pb-3">
          {statusLine && (
            <span
              className={`text-body-md min-w-0 font-bold tabular-nums ${
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
              className={`text-body shrink-0 font-bold ${
                verdict === "적중" ? "text-accent" : "text-text-4"
              }`}
            >
              {verdict}
            </span>
          )}
          <div className="flex-1" />
          <span className="text-label text-text-3 shrink-0 whitespace-nowrap tabular-nums">
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
          />
        )}
      </div>

      {summary.status !== "UPCOMING" && (
        <div className="px-edge pt-6.5 pb-6">
          <div className="flex items-center gap-1.5">
            <h2 className="text-body-lg text-text-strong tracking-section font-bold">
              의견
            </h2>
            <div className="flex-1" />
            {locked && (
              <button
                type="button"
                onClick={() => openCompose(false)}
                className="bg-accent text-on-accent rounded-control text-body inline-flex h-9 items-center px-3.5 font-bold active:opacity-80"
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
              onCancel={() => setSheet({ kind: "cancel" })}
            />
          )}
          {locked && (
            <PredictionLockedList onCompose={() => openCompose(false)} />
          )}
        </div>
      )}

      {sheet?.kind === "compose" && (
        <PredictionComposerSheet
          header={header}
          mine={sheet.mine}
          onClose={() => setSheet(null)}
          onFailure={handleFailure}
        />
      )}
      {sheet?.kind === "auth" && (
        <PredictionAuthSheet mode={sheet.mode} onClose={() => setSheet(null)} />
      )}
      {sheet?.kind === "cancel" && (
        <PredictionCancelSheet
          matchId={header.id}
          onClose={() => setSheet(null)}
          onFailure={handleFailure}
        />
      )}
    </>
  );
}

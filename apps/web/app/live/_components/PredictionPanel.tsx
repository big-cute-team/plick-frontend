"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useState } from "react";
import { useMatchBriefing } from "@plick/core/match-briefing-queries";
import type { PredictionFailure } from "@plick/core/prediction-errors";
import type { MatchSummary } from "@plick/domain/live";
import {
  formatPredictionCount,
  predictionStatusLine,
  predictionVerdictLabel,
  type MyPrediction,
  type PredictionPick,
  type PredictionSummary,
} from "@plick/domain/prediction";
import { MatchBriefingCard } from "@plick/ui/MatchBriefingCard";
import { PredictionBar } from "@plick/ui/PredictionBar";
import { ChevronRightIcon } from "@plick/ui/icons";
import { SESSION_KIND, SESSION_KIND_COOKIE } from "@/_constants/api";
import { readCookie } from "@/_utils/cookie";
import {
  PREDICTION_RANKING_LINK_LABEL,
  PREDICTION_VOTE_LABEL,
} from "@/_constants/predictions";
import { RANKINGS_PATH } from "@/_constants/app";
import { PredictionOpinions } from "./PredictionOpinions";
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

/** 지금 떠 있는 팝업. 한 번에 하나만 선다. 작성 팝업의 `pick`은 바 칸에서 열 때 미리 고른 픽이다. */
type Dialog =
  | { kind: "compose"; mine: MyPrediction | null; pick: PredictionPick | null }
  | { kind: "auth"; mode: "login" | "link" | "submitted" }
  | { kind: "cancel" }
  | null;

/**
 * 경기 상세 예측 탭 본문 (KAN-696, 시안 가이드 §4·§5.4, 모바일 `PredictionTab`의 웹 판). 위에서
 * 아래로 투표(상태 줄과 참여 수, 3분할 바 36px), AI 경기 브리핑 카드(KAN-724), 여론
 * (`PredictionOpinions`)이다. KAN-709에서 프리뷰 탭(팀 비교, 결장자, 상대 전적, 리그 순위)을 이 탭에
 * 합치고 결장자를 접어 뒀는데, 브리핑이 들어오자 한 탭이 너무 길어져 KAN-729에서 프리뷰를 다시
 * `PreviewPanel`로 뗐다. 이 탭은 요약이 있는 경기에만 서므로(`matchTabsFor`) `summary`는 null이 아니다.
 *
 * 상태별 표시와 로그인 분기, 마감 409 처리는 모바일과 같다. UPCOMING은 열림 시각만, OPEN 예측
 * 전은 `?%` 바와 그 바로 아래 `투표하기` 버튼, 잠금 지면이다. 바의 칸을 눌러도 그 픽이 골라진 작성
 * 팝업이 열린다 (KAN-710. 전에는 버튼이 여론 머리글에 있어 프리뷰 아래로 밀렸다). 예측 뒤는 실제
 * 비율과 내 예측 상자(수정, 취소), LOCKED 이후는 읽기 전용이다. 정산된 경기는 상태 줄 오른쪽에 랭킹
 * 페이지로 가는 `랭킹 >` 링크가 선다(KAN-701).
 *
 * 투표와 여론 사이에 AI 경기 브리핑 카드(KAN-724)가 선다. 모바일과 같은 훅(`useMatchBriefing`)이
 * 예정 경기에서만 브라우저로 받고, 없거나 만료됐거나 킥오프가 지나면 자리 자체가 사라진다.
 *
 * 토스트는 웹에 전역 스토어가 없어 이 컴포넌트가 문구와 일련번호를 들고 `PredictionToast`에 넘긴다.
 *
 * @param header 경기 헤더(두 팀, 상태)
 * @param summary 예측 요약
 */
export function PredictionPanel({
  header,
  summary,
}: {
  header: MatchSummary;
  summary: PredictionSummary;
}) {
  const briefing = useMatchBriefing(header);
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
  const statusLine = predictionStatusLine(summary, teams);
  const verdict = predictionVerdictLabel(mine?.result);
  /* 예측 전의 OPEN. 바 칸이 버튼이 되고 바 아래 투표하기가 선다 */
  const votable = summary.status === "OPEN" && mine === null;

  /* 고칠 내 예측은 여는 순간의 값을 들고 간다. 열려 있는 동안 요약이 다시 와도 시트가 모드를 바꾸지 않게 */
  function openCompose(editing: boolean, pick: PredictionPick | null = null) {
    setDialog({ kind: "compose", mine: editing ? mine : null, pick });
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
    <div className="pt-4">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 pb-2.5">
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
        {summary.status === "SETTLED" && (
          <Link
            href={RANKINGS_PATH}
            className="text-body text-accent hover:text-accent-hover focus-visible:outline-accent flex shrink-0 items-center gap-px font-bold focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {PREDICTION_RANKING_LINK_LABEL}
            <ChevronRightIcon size={14} />
          </Link>
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
          onPick={votable ? (pick) => openCompose(false, pick) : undefined}
        />
      )}
      {votable && (
        <button
          type="button"
          onClick={() => openCompose(false)}
          className="text-body-md text-accent hover:text-accent-hover focus-visible:outline-accent mt-1 -mr-2 ml-auto flex h-9 w-fit items-center px-2 font-bold focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {PREDICTION_VOTE_LABEL}
        </button>
      )}

      {briefing && (
        <MatchBriefingCard briefing={briefing} size="lg" className="mt-4" />
      )}

      {summary.status !== "UPCOMING" && (
        <PredictionOpinions
          summary={summary}
          teams={teams}
          onCompose={() => openCompose(false)}
          onEdit={() => openCompose(true)}
          onCancel={() => setDialog({ kind: "cancel" })}
        />
      )}

      {dialog?.kind === "compose" && (
        <PredictionComposerDialog
          header={header}
          mine={dialog.mine}
          initialPick={dialog.pick}
          onClose={() => setDialog(null)}
          onFailure={handleFailure}
          onSubmitted={() =>
            setDialog(
              readCookie(SESSION_KIND_COOKIE) === SESSION_KIND.guest
                ? { kind: "auth", mode: "submitted" }
                : null,
            )
          }
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

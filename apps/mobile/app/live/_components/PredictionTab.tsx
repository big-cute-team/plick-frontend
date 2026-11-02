"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
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
import { ChevronRightIcon } from "@plick/ui/icons";
import { SESSION_KIND, SESSION_KIND_COOKIE } from "@/_constants/api";
import { readCookie } from "@/_utils/cookie";
import { PREDICTION_RANKING_LINK_LABEL } from "@/_constants/predictions";
import { useErrorToast } from "@/_stores/error-toast";
import { debateTabPath } from "@/_utils/debates";
import { PredictionOpinions } from "./PredictionOpinions";

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
  | { kind: "auth"; mode: "login" | "link" | "submitted" }
  | { kind: "cancel" }
  | null;

/**
 * 경기 상세 예측 탭 (KAN-696, 시안 가이드 §4·§5.4). 위에서 아래로 상태 줄(참여 수), 3분할 바,
 * 그리고 의견 자리(`PredictionOpinions`: 머리글, 픽 필터, 내 예측 상자, 잠금 지면이나 의견 목록)다.
 *
 * 상태별로 보이는 것이 다르다(§4 표). UPCOMING은 열림 시각만 보이고 바와 작성, 의견이 없다.
 * OPEN에서 예측 전이면 바는 `?%` 균등이고 의견 자리는 잠금 지면이라 거기서 작성이 열린다. 예측
 * 뒤에는 실제 비율에 내 픽 체크, 내 예측 상자(수정, 취소)가 선다. LOCKED 이후는 바와 상자만 읽기
 * 전용이다. 의견 목록과 정렬, 픽 필터, 공감, 신고, 차단은 KAN-697이 붙였다.
 *
 * 게스트도 작성 시트를 연다(KAN-705). 제출 성공 뒤에만 연동 안내를 띄운다.
 * 마감·인증 실패는 서버 응답을 기준으로 처리한다.
 *
 * 정산된 경기는 상태 줄 오른쪽에 투표 화면 랭킹 탭으로 가는 `랭킹 >` 링크가 선다(KAN-701, 시안 가이드
 * §4). 글자가 작아 세로 패딩으로 터치 목표를 넓히고 음수 마진으로 줄 높이는 그대로 둔다.
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
  const showToast = useErrorToast((state) => state.show);
  const [sheet, setSheet] = useState<Sheet>(null);

  const teams = { home: header.home.name, away: header.away.name };
  const mine = summary.myPrediction;
  const statusLine = predictionStatusLine(summary, teams);
  const verdict = predictionVerdictLabel(mine?.result);

  /* 고칠 내 예측은 여는 순간의 값을 들고 간다. 열려 있는 동안 요약이 다시 와도 시트가 모드를 바꾸지 않게 */
  function openCompose(editing: boolean) {
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
          {summary.status === "SETTLED" && (
            <Link
              href={debateTabPath("rank")}
              className="text-body text-accent -my-3 flex shrink-0 items-center gap-px py-3 font-bold active:opacity-60"
            >
              {PREDICTION_RANKING_LINK_LABEL}
              <ChevronRightIcon size={14} />
            </Link>
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
        <PredictionOpinions
          summary={summary}
          teams={teams}
          onCompose={() => openCompose(false)}
          onEdit={() => openCompose(true)}
          onCancel={() => setSheet({ kind: "cancel" })}
        />
      )}

      {sheet?.kind === "compose" && (
        <PredictionComposerSheet
          header={header}
          mine={sheet.mine}
          onClose={() => setSheet(null)}
          onFailure={handleFailure}
          onSubmitted={() =>
            setSheet(
              readCookie(SESSION_KIND_COOKIE) === SESSION_KIND.guest
                ? { kind: "auth", mode: "submitted" }
                : null,
            )
          }
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

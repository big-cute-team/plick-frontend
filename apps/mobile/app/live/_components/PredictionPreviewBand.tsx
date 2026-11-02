"use client";

import type { MatchSummary } from "@plick/domain/live";
import {
  formatPredictionCount,
  predictionStatusLine,
  type PredictionSummary,
} from "@plick/domain/prediction";
import { PredictionBar } from "@plick/ui/PredictionBar";
import { PREDICTION_VOTE_LABEL } from "@/_constants/predictions";

/**
 * 프리뷰 탭 승부예측 묶음 (KAN-699, 시안 가이드 §5.3 "상태, 3분할 바, 작은 투표하기(예측 전만),
 * 의견 [n] 링크(예측 탭으로)"). 제목 줄 오른쪽은 상태 줄이 있으면 상태, 없으면(OPEN) 참여 수다.
 * 바는 예측 탭과 같은 `PredictionBar`라 예측 전엔 `?%` 균등이고 UPCOMING은 그리지 않는다.
 *
 * 아래 줄 전체가 예측 탭으로 가는 버튼이다. 투표하기 알약도 같은 곳으로 간다. 작성 시트와 로그인·연동
 * 분기는 예측 탭(`PredictionTab`)이 다 들고 있어 여기서 시트를 또 세우지 않고 탭으로 보낸다(티켓은 이
 * 묶음을 "예측 탭으로 가는 하단 띠"라 했다). 의견 수는 참여 수와 같은 숫자라 비공개면 `?`다.
 *
 * @param header 경기 헤더(팀명, 엠블럼)
 * @param summary 예측 요약
 * @param onOpenPrediction 예측 탭으로 갈 때
 */
export function PredictionPreviewBand({
  header,
  summary,
  onOpenPrediction,
}: {
  header: MatchSummary;
  summary: PredictionSummary;
  onOpenPrediction: () => void;
}) {
  const teams = { home: header.home.name, away: header.away.name };
  const statusLine = predictionStatusLine(summary, teams);
  const mine = summary.myPrediction;
  const showVote = summary.status === "OPEN" && !mine;
  const count =
    summary.totalCount === null
      ? "?"
      : summary.totalCount.toLocaleString("ko-KR");

  return (
    <section>
      <div className="flex items-baseline gap-2 pt-7.5 pb-3">
        <h2 className="text-body-lg text-text-strong tracking-section font-black">
          승부예측
        </h2>
        <div className="flex-1" />
        <span
          className={`text-label min-w-0 text-right font-bold tabular-nums ${
            summary.status === "LOCKED" || summary.status === "SETTLED"
              ? "text-text-strong"
              : "text-text-3"
          }`}
        >
          {statusLine ?? formatPredictionCount(summary.totalCount)}
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
      <button
        type="button"
        onClick={onOpenPrediction}
        className="mt-2 flex min-h-11 w-full items-center gap-1 active:opacity-70"
      >
        {showVote && (
          <span className="bg-accent text-on-accent rounded-control text-body inline-flex h-9 items-center px-3.5 font-bold">
            {PREDICTION_VOTE_LABEL}
          </span>
        )}
        <span className="flex-1" />
        <span className="text-label text-text-3">의견</span>
        <span className="text-body text-danger font-bold tabular-nums">
          [{count}]
        </span>
      </button>
    </section>
  );
}

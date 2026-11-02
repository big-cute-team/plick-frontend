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
 * 프리뷰 탭 승부예측 묶음 (KAN-699, 시안 가이드 §5.3, 모바일 `PredictionPreviewBand`의 웹 판). 제목 옆에
 * 상태 줄(없으면 참여 수), 3분할 바(36px), 아래 줄에 투표하기(예측 전만)와 `의견 [n]`이다.
 *
 * 투표하기와 의견 링크 둘 다 예측 탭으로 간다. 작성 팝업과 로그인 분기는 예측 탭(`PredictionPanel`)이
 * 들고 있어 여기서 팝업을 또 세우지 않는다(티켓은 이 묶음을 "예측 탭으로 가는 하단 띠"라 했다).
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
      <div className="flex flex-wrap items-baseline gap-2.5 pt-8.5 pb-3">
        <p className="text-body-lg text-text-strong font-black">승부예측</p>
        <span
          className={`text-body min-w-0 font-bold tabular-nums ${
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
          size="lg"
        />
      )}
      <div className="flex items-center gap-2.5 pt-3">
        {showVote && (
          <button
            type="button"
            onClick={onOpenPrediction}
            className="bg-accent text-on-accent hover:bg-accent-hover focus-visible:outline-accent text-body inline-flex h-8.5 items-center px-3.5 font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {PREDICTION_VOTE_LABEL}
          </button>
        )}
        <div className="flex-1" />
        <button
          type="button"
          onClick={onOpenPrediction}
          className="hover:text-text-strong focus-visible:outline-accent flex items-baseline gap-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <span className="text-body text-text-3">의견</span>
          <span className="text-body text-danger font-bold tabular-nums">
            [{count}]
          </span>
        </button>
      </div>
    </section>
  );
}

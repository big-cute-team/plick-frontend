"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { classifyPredictionError } from "@plick/core/prediction-errors";
import { COMMENT_REPORT_REASONS } from "@plick/domain/constants";
import type { PredictionReportReason } from "@plick/domain/prediction";
import { PREDICTION_REPORT_TITLE } from "@/_constants/predictions";
import { useReportPredictionOpinion } from "@/_hooks/useReportPredictionOpinion";

/**
 * 예측 의견 신고 팝업 (KAN-697, 모바일 `PredictionReportSheet`의 웹 판). 댓글 신고 팝업
 * (`ReportCommentDialog`)과 같은 각진 상자와 사유 다섯 줄인데 제목이 `의견 신고`이고 뮤테이션과
 * 실패 분류가 예측 쪽이라 따로 뒀다. 댓글 팝업은 댓글 신고 훅과 `AUTH_REQUIRED` 판정을 안에
 * 박고 있어 그대로 못 쓴다.
 *
 * 사유를 고르기 전에는 신고 버튼이 흐리다. 접수 성공하면 "신고가 접수되었어요" 안내로 바뀐다.
 * 내 글 400 `PREDICTION_SELF_REPORT`와 중복 409 `REPORT_DUPLICATED`는 가이드 문구를 상자 안에
 * 남겨 바로 닫을 수 있게 하고, 401과 게스트 403은 `onAuthRequired`로 올려 로그인 안내로 돌린다.
 *
 * body 포털 이유는 `ConfirmDialog`와 같다.
 *
 * @param predictionId 신고할 의견 id
 * @param nickname 의견 작성자. 설명 줄에 쓴다
 * @param onClose 취소·완료·딤 클릭으로 닫을 때
 * @param onAuthRequired 로그인이나 계정 연동이 필요할 때. 호출부가 팝업을 닫고 안내로 돌린다
 */
export function PredictionReportDialog({
  predictionId,
  nickname,
  onClose,
  onAuthRequired,
}: {
  predictionId: number;
  nickname: string;
  onClose: () => void;
  onAuthRequired: () => void;
}) {
  /* 포털 대상(document)은 서버 렌더에 없다. 마운트 뒤에만 그려 hydration을 맞춘다 */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [reason, setReason] = useState<PredictionReportReason | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const { mutate, isPending } = useReportPredictionOpinion();

  if (!mounted) return null;

  function handleSubmit() {
    if (reason === null) return;
    setError(null);
    mutate(
      { predictionId, reason },
      {
        onSuccess: () => setDone(true),
        onError: (err) => {
          const failure = classifyPredictionError(err);
          if (failure.kind === "login" || failure.kind === "link-account") {
            onAuthRequired();
            return;
          }
          setError(failure.message);
        },
      },
    );
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prediction-report-title"
    >
      {/* 딤 — 클릭하면 닫는다 */}
      <button
        type="button"
        aria-label="닫기"
        onClick={() => !isPending && onClose()}
        className="bg-dim-strong absolute inset-0"
      />

      <div className="bg-bg border-border-strong shadow-dialog relative w-full max-w-76 border px-5.5 pt-5.5 pb-5">
        {done ? (
          <>
            <p
              id="prediction-report-title"
              className="text-body-lg text-text-strong text-center font-black"
            >
              신고가 접수되었어요
            </p>
            <p className="text-label-lg text-text-3 mt-2 text-center leading-[1.6]">
              운영자가 확인한 뒤 조치할게요
            </p>
            <button
              type="button"
              onClick={onClose}
              className="bg-accent text-on-accent text-body hover:bg-accent-hover focus-visible:outline-accent mt-4.5 flex h-9.5 w-full items-center justify-center font-bold focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              확인
            </button>
          </>
        ) : (
          <>
            <p
              id="prediction-report-title"
              className="text-body-lg text-text-strong text-center font-black"
            >
              {PREDICTION_REPORT_TITLE}
            </p>
            <p className="text-label text-text-3 mt-1.75 text-center">
              {nickname}님의 의견을 신고합니다
            </p>

            <div
              role="radiogroup"
              aria-label="신고 사유"
              className="mt-4 flex flex-col"
            >
              {COMMENT_REPORT_REASONS.map(({ value, label }) => {
                const selected = reason === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setReason(value)}
                    className="border-border-soft focus-visible:outline-accent flex items-center justify-between border-t py-2.5 focus-visible:outline-2 focus-visible:-outline-offset-2"
                  >
                    <span
                      className={`text-body ${
                        selected ? "text-text-strong font-bold" : "text-text-2"
                      }`}
                    >
                      {label}
                    </span>
                    {/* 라디오 표시 — 선택되면 강조색 링 + 안쪽 점 */}
                    <span
                      className={`grid size-4.25 place-items-center rounded-full border ${
                        selected ? "border-accent" : "border-border-strong"
                      }`}
                    >
                      {selected && (
                        <span className="bg-accent size-2.25 rounded-full" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {error && (
              <p className="text-caption text-danger-strong mt-2 text-center">
                {error}
              </p>
            )}

            <div className="mt-4 flex gap-2.25">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="border-border-strong text-text-2 text-body hover:bg-elevate focus-visible:outline-accent inline-flex h-9.5 flex-1 items-center justify-center border font-bold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || reason === null}
                className="bg-danger text-on-accent text-body focus-visible:outline-accent inline-flex h-9.5 flex-1 items-center justify-center font-bold hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
              >
                신고하기
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

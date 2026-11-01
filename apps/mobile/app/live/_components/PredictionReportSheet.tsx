"use client";

import { useState } from "react";
import { classifyPredictionError } from "@plick/core/prediction-errors";
import { COMMENT_REPORT_REASONS } from "@plick/domain/constants";
import type { PredictionReportReason } from "@plick/domain/prediction";
import { CheckIcon } from "@plick/ui/icons";
import {
  BottomSheet,
  SheetActions,
  SheetDone,
} from "@/_components/BottomSheet";
import { PREDICTION_REPORT_TITLE } from "@/_constants/predictions";
import { useReportPredictionOpinion } from "@/_hooks/useReportPredictionOpinion";

/**
 * 예측 의견 신고 시트 (KAN-697). 댓글 신고 시트(`ReportCommentDialog`)와 같은 사유 다섯 행인데
 * 제목이 `의견 신고`이고 뮤테이션과 실패 분류가 예측 쪽이라 따로 뒀다. 댓글 시트는 댓글 신고
 * 훅과 `AUTH_REQUIRED` 판정을 안에 박고 있어 그대로 못 쓴다.
 *
 * 고르면 행이 강조색 틴트로 바뀌며 신고 버튼이 살아난다. 접수 성공하면 같은 시트가 완료 상태로
 * 바뀐다. 내 글 400 `PREDICTION_SELF_REPORT`와 중복 409 `REPORT_DUPLICATED`는 가이드 문구를
 * 시트 안에 남기고, 401과 게스트 403은 `onAuthRequired`로 올려 로그인·연동 안내로 돌린다.
 *
 * @param predictionId 신고할 의견 id
 * @param onClose 시트 닫기
 * @param onAuthRequired 로그인이나 계정 연동이 필요할 때. 호출부가 시트를 닫고 안내로 돌린다
 */
export function PredictionReportSheet({
  predictionId,
  onClose,
  onAuthRequired,
}: {
  predictionId: number;
  onClose: () => void;
  onAuthRequired: () => void;
}) {
  const [reason, setReason] = useState<PredictionReportReason | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const { mutate, isPending } = useReportPredictionOpinion();

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

  return (
    <BottomSheet
      onClose={onClose}
      label={PREDICTION_REPORT_TITLE}
      locked={isPending}
    >
      {done ? (
        <SheetDone
          title="신고가 접수되었어요"
          description="운영자가 확인한 뒤 조치할게요"
          onClose={onClose}
        />
      ) : (
        <>
          <p className="text-title text-text-strong tracking-heading font-black">
            {PREDICTION_REPORT_TITLE}
          </p>
          <p className="text-label-lg text-text-3 mt-1.5 mb-4">
            사유를 골라주세요
          </p>

          <div
            role="radiogroup"
            aria-label="신고 사유"
            className="flex flex-col gap-2"
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
                  className={`rounded-control flex h-12 items-center gap-2.5 border px-3.5 text-left active:opacity-70 ${
                    selected
                      ? "bg-accent-tint border-accent-border"
                      : "bg-elevate border-transparent"
                  }`}
                >
                  <span
                    className={`text-body-md flex-1 ${
                      selected
                        ? "text-accent font-bold"
                        : "text-text-strong font-medium"
                    }`}
                  >
                    {label}
                  </span>
                  {selected && (
                    <CheckIcon size={17} className="text-accent shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {error && (
            <p className="text-caption text-danger-strong mt-2">{error}</p>
          )}

          <SheetActions
            onCancel={onClose}
            onConfirm={handleSubmit}
            confirmLabel="신고하기"
            disabled={reason === null}
            pending={isPending}
          />
        </>
      )}
    </BottomSheet>
  );
}

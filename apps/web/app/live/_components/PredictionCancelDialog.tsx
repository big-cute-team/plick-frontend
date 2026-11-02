"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { PredictionFailure } from "@plick/core/prediction-errors";
import { PREDICTION_CANCEL_TITLE } from "@/_constants/predictions";
import { usePredictionCancel } from "@/_hooks/usePredictionCancel";

/**
 * 예측 취소 확인 팝업 (KAN-696, 시안 가이드 §5.5). `예측을 취소할까요?` 아래 닫기와 진한 `예측
 * 취소` 버튼이다. 공용 `ConfirmDialog`는 확정 버튼이 빨강(신고·차단·삭제)인데 예측 취소는 위험
 * 행동이 아니라 시안이 진한 글자색 면으로 그려 따로 둔다.
 *
 * 마감 뒤 취소(409)는 `onFailure`로 올려 탭이 토스트를 띄우고 팝업을 닫는다. 그 밖의 실패 문구는
 * 팝업 안에 남겨 다시 시도할 수 있게 한다. body 포털 이유는 `ConfirmDialog`와 같다.
 *
 * @param matchId 경기 id
 * @param onClose 팝업 닫기(닫기 버튼, 딤, 성공)
 * @param onFailure 마감 같은 화면 전환이 필요한 실패를 넘긴다
 */
export function PredictionCancelDialog({
  matchId,
  onClose,
  onFailure,
}: {
  matchId: number;
  onClose: () => void;
  onFailure: (failure: PredictionFailure) => void;
}) {
  /* 포털 대상(document)은 서버 렌더에 없다. 마운트 뒤에만 그려 hydration을 맞춘다 */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [error, setError] = useState<string | null>(null);
  const { mutate, isPending } = usePredictionCancel(matchId, (failure) => {
    if (failure.kind === "closed") {
      onFailure(failure);
      return;
    }
    setError(failure.message);
  });

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-8"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="prediction-cancel-title"
    >
      <button
        type="button"
        aria-label="닫기"
        onClick={() => !isPending && onClose()}
        className="bg-dim-strong absolute inset-0"
      />
      <div className="bg-bg border-border-strong shadow-dialog relative w-full max-w-76 border px-5.5 pt-6 pb-5">
        <p
          id="prediction-cancel-title"
          className="text-body-lg text-text-strong text-center font-bold"
        >
          {PREDICTION_CANCEL_TITLE}
        </p>
        {error && (
          <p
            role="alert"
            className="text-caption text-danger-strong mt-2 text-center"
          >
            {error}
          </p>
        )}
        <div className="mt-4.5 flex gap-2.25">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="bg-chip text-text-2 text-body hover:bg-border-strong focus-visible:outline-accent inline-flex h-9.5 flex-1 items-center justify-center font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={() => mutate(undefined, { onSuccess: onClose })}
            disabled={isPending}
            className="bg-text-strong text-on-accent text-body focus-visible:outline-accent inline-flex h-9.5 flex-1 items-center justify-center font-bold hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
          >
            예측 취소
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

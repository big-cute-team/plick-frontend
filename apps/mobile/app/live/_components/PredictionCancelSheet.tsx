"use client";

import { useState } from "react";
import type { PredictionFailure } from "@plick/core/prediction-errors";
import { BottomSheet } from "@/_components/BottomSheet";
import { PREDICTION_CANCEL_TITLE } from "@/_constants/predictions";
import { usePredictionCancel } from "@/_hooks/usePredictionCancel";

/**
 * 예측 취소 확인 시트 (KAN-696, 시안 가이드 §5.5). `예측을 취소할까요?` 아래 닫기와 진한 `예측
 * 취소` 버튼이다. 공용 `ConfirmDialog`는 확정 버튼이 빨강(신고·차단·삭제)인데 예측 취소는 위험
 * 행동이 아니라 시안이 진한 글자색 면으로 그려 따로 둔다.
 *
 * 마감 뒤 취소(409)는 `onFailure`로 올려 탭이 토스트를 띄우고 시트를 닫는다. 그 밖의 실패 문구는
 * 시트 안에 남겨 다시 시도할 수 있게 한다.
 *
 * @param matchId 경기 id
 * @param onClose 시트 닫기(닫기 버튼, 딤, 성공)
 * @param onFailure 마감 같은 화면 전환이 필요한 실패를 넘긴다
 */
export function PredictionCancelSheet({
  matchId,
  onClose,
  onFailure,
}: {
  matchId: number;
  onClose: () => void;
  onFailure: (failure: PredictionFailure) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const { mutate, isPending } = usePredictionCancel(matchId, (failure) => {
    if (failure.kind === "closed") {
      onFailure(failure);
      return;
    }
    setError(failure.message);
  });

  return (
    <BottomSheet
      onClose={onClose}
      label={PREDICTION_CANCEL_TITLE}
      locked={isPending}
    >
      <p className="text-title text-text-strong tracking-heading font-black">
        {PREDICTION_CANCEL_TITLE}
      </p>
      {error && (
        <p role="alert" className="text-caption text-danger-strong mt-2">
          {error}
        </p>
      )}
      <div className="mt-5 flex gap-2.25">
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="bg-chip text-text-2 rounded-control text-body-md flex h-12 flex-1 items-center justify-center font-bold active:opacity-60 disabled:opacity-40"
        >
          닫기
        </button>
        <button
          type="button"
          onClick={() => mutate(undefined, { onSuccess: onClose })}
          disabled={isPending}
          className="bg-text-strong text-on-accent rounded-control text-body-md flex h-12 flex-1 items-center justify-center font-bold active:opacity-60 disabled:opacity-40"
        >
          예측 취소
        </button>
      </div>
    </BottomSheet>
  );
}

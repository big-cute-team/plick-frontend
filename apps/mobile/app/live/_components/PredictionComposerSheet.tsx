"use client";

import { useEffect, useState } from "react";
import {
  readPredictionDraft,
  writePredictionDraft,
} from "@plick/core/prediction-draft";
import {
  keepsComposerOpen,
  type PredictionFailure,
} from "@plick/core/prediction-errors";
import type { MatchSummary } from "@plick/domain/live";
import {
  isPredictionOpinionLengthValid,
  PREDICTION_PICKS,
  PREDICTION_TEXT_MAX_LENGTH,
  predictionPickLabel,
  predictionTextLength,
  type MyPrediction,
  type PredictionDraft,
  type PredictionPick,
} from "@plick/domain/prediction";
import { LiveCrest } from "@plick/ui/LiveCrest";
import { BottomSheet } from "@/_components/BottomSheet";
import { PREDICTION_OPINION_PLACEHOLDER } from "@/_constants/predictions";
import { usePredictionCompose } from "@/_hooks/usePredictionCompose";

/**
 * 예측 작성 시트 (KAN-696, 시안 가이드 §5.5). `맨유 vs 맨시티` 제목, 픽 3칸, 입력란, 글자 수,
 * 등록 버튼이다. 픽을 고르고 공백 뺀 5자 이상이어야 등록 버튼이 채운 면이 되고, 아니면 회색이다.
 * 라벨은 새로 쓰면 `예측 등록`, 내 예측을 고치면 `수정`이다. 입력은 300자에서 자른다.
 *
 * 임시 저장은 새로 쓸 때만 한다. 글자를 칠 때마다 경기별 localStorage에 픽과 본문을 적고, 닫았다
 * 열면 되살린다. 수정 모드는 내 예측 본문이 원본이라 적지 않는다. 등록 성공은 뮤테이션 훅이 지운다.
 *
 * 서버 금칙어(`PREDICTION_OPINION_BLOCKED`)와 길이 오류는 시트를 닫지 않고 입력란에 1px 진한
 * 테두리와 문구를 띄운다. 고쳐서 다시 보낼 수 있는 입력 문제라서다(`keepsComposerOpen`). 로그인,
 * 연동, 마감 같은 나머지 실패는 `onFailure`로 올려 탭이 시트를 갈아 끼우거나 토스트를 띄운다.
 *
 * 예측 탭의 3분할 바 칸을 눌러 열면(KAN-710) `initialPick`이 그 칸이다. 새로 쓸 때만 쓰고 임시
 * 저장된 픽이 있어도 지금 누른 칸이 이긴다. 본문은 임시 저장을 그대로 되살린다.
 *
 * @param header 경기 헤더(제목과 픽 라벨, 엠블럼)
 * @param mine 고칠 내 예측. 없으면 새로 쓰기
 * @param initialPick 바 칸에서 열 때 미리 고른 픽. 없으면 임시 저장이나 빈 상태
 * @param onClose 시트를 닫을 때(딤, Escape)
 * @param onSubmitted 저장 성공 후 연동 안내로 전환한다
 * @param onFailure 입력 문제가 아닌 실패를 넘긴다
 */
export function PredictionComposerSheet({
  header,
  mine,
  initialPick = null,
  onClose,
  onSubmitted,
  onFailure,
}: {
  header: MatchSummary;
  mine: MyPrediction | null;
  initialPick?: PredictionPick | null;
  onClose: () => void;
  onSubmitted: () => void;
  onFailure: (failure: PredictionFailure) => void;
}) {
  const matchId = header.id;
  const editing = mine !== null;
  const [draft, setDraft] = useState<PredictionDraft>(() => {
    if (editing) return { pick: mine.pick, opinion: mine.opinion };
    const saved = readPredictionDraft(matchId) ?? { pick: null, opinion: "" };
    return initialPick ? { ...saved, pick: initialPick } : saved;
  });
  const { pick, opinion } = draft;
  const [fieldError, setFieldError] = useState<string | null>(null);

  const { mutate, isPending } = usePredictionCompose(matchId, (failure) => {
    if (keepsComposerOpen(failure.kind)) {
      setFieldError(failure.message);
      return;
    }
    onFailure(failure);
  });

  const teams = { home: header.home.name, away: header.away.name };
  const length = predictionTextLength(opinion);
  const valid = pick !== null && isPredictionOpinionLengthValid(opinion);

  /* 새로 쓸 때만 임시 저장한다. 픽과 본문이 한 state라 둘을 같은 값으로 적는다 */
  useEffect(() => {
    if (!editing) writePredictionDraft(matchId, draft);
  }, [editing, matchId, draft]);

  function update(next: Partial<PredictionDraft>) {
    setDraft((current) => ({
      pick: next.pick === undefined ? current.pick : next.pick,
      opinion:
        next.opinion === undefined
          ? current.opinion
          : next.opinion.slice(0, PREDICTION_TEXT_MAX_LENGTH),
    }));
    setFieldError(null);
  }

  function submit() {
    if (!valid || isPending || pick === null) return;
    mutate({ pick, opinion: opinion.trim() }, { onSuccess: onSubmitted });
  }

  return (
    <BottomSheet onClose={onClose} label="예측 작성" locked={isPending}>
      <p className="text-title text-text-strong tracking-heading font-black">
        {teams.home} vs {teams.away}
      </p>
      <div
        role="group"
        aria-label="승무패 선택"
        className="mt-4 grid grid-cols-3 gap-1.5"
      >
        {PREDICTION_PICKS.map((option) => {
          const on = pick === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={on}
              onClick={() => update({ pick: option })}
              className={`rounded-control flex h-12 min-w-0 items-center justify-center gap-1.5 px-2 active:opacity-80 ${
                on ? "bg-text-strong text-on-accent" : "bg-chip text-text-2"
              }`}
            >
              {option !== "DRAW" && (
                <LiveCrest
                  team={option === "HOME" ? header.home : header.away}
                  size={18}
                  decorative
                />
              )}
              <span className="text-body min-w-0 truncate font-bold">
                {predictionPickLabel(option, teams)}
              </span>
            </button>
          );
        })}
      </div>
      <textarea
        value={opinion}
        onChange={(e) => update({ opinion: e.target.value })}
        placeholder={PREDICTION_OPINION_PLACEHOLDER}
        maxLength={PREDICTION_TEXT_MAX_LENGTH}
        aria-label="의견"
        aria-invalid={fieldError !== null}
        className={`bg-chip rounded-control text-body-md text-text-strong placeholder:text-text-4 mt-3 block h-32 w-full resize-none px-3.5 py-3 leading-relaxed focus-visible:outline-none ${
          fieldError ? "ring-text-strong ring-1 ring-inset" : ""
        }`}
      />
      <div className="flex min-h-4.5 items-baseline gap-2 pt-2">
        {fieldError && (
          <p role="alert" className="text-label text-text-strong font-bold">
            {fieldError}
          </p>
        )}
        <div className="flex-1" />
        <span className="text-label text-text-4 tabular-nums">
          {length}/{PREDICTION_TEXT_MAX_LENGTH}
        </span>
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={!valid || isPending}
        className={`rounded-control text-body-lg mt-3.5 flex h-12.5 w-full items-center justify-center active:opacity-80 ${
          valid
            ? "bg-accent text-on-accent font-bold"
            : "bg-chip text-text-4 font-medium"
        }`}
      >
        {editing ? "수정" : "예측 등록"}
      </button>
    </BottomSheet>
  );
}

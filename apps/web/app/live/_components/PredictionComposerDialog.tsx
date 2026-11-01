"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
} from "@plick/domain/prediction";
import { LiveCrest } from "@plick/ui/LiveCrest";
import { PREDICTION_OPINION_PLACEHOLDER } from "@/_constants/predictions";
import { usePredictionCompose } from "@/_hooks/usePredictionCompose";

/**
 * 예측 작성 팝업 (KAN-696, 시안 가이드 §5.5, 모바일 `PredictionComposerSheet`의 웹 판). 440px
 * 각진 상자에 `맨유 vs 맨시티` 제목, 픽 3칸, 입력란, 글자 수, 취소와 등록 버튼이다. 픽을 고르고
 * 공백 뺀 5자 이상이어야 등록 버튼이 채운 면이 되고 라벨은 새로 쓰면 `예측 등록`, 고치면 `수정`이다.
 * 신고 팝업과 같은 틀(`border-strong` + `shadow-dialog`)이고, 시안은 누른 위치 근처에 띄우지만
 * 다른 팝업과 같이 화면 가운데에 둔다. 스크롤 위치마다 팝업 자리가 달라지는 것보다 늘 같은 자리가
 * 낫다고 봤다.
 *
 * 임시 저장과 입력 오류 처리는 모바일과 같다. 새로 쓸 때만 경기별 localStorage에 적고, 금칙어와
 * 길이 오류는 팝업을 닫지 않고 입력란 아래 문구로 띄운다. 그 밖의 실패는 `onFailure`로 올린다.
 *
 * body 포털 이유는 `ConfirmDialog`와 같다. 딤 클릭과 Escape로 닫히고 요청 중에는 잠근다.
 *
 * @param header 경기 헤더(제목과 픽 라벨, 엠블럼)
 * @param mine 고칠 내 예측. 없으면 새로 쓰기
 * @param onClose 팝업을 닫을 때(취소, 딤, Escape, 등록 성공)
 * @param onFailure 입력 문제가 아닌 실패를 넘긴다
 */
export function PredictionComposerDialog({
  header,
  mine,
  onClose,
  onFailure,
}: {
  header: MatchSummary;
  mine: MyPrediction | null;
  onClose: () => void;
  onFailure: (failure: PredictionFailure) => void;
}) {
  const matchId = header.id;
  const editing = mine !== null;
  /* 포털 대상(document)은 서버 렌더에 없다. 마운트 뒤에만 그려 hydration을 맞춘다 */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [draft, setDraft] = useState<PredictionDraft>(() =>
    editing
      ? { pick: mine.pick, opinion: mine.opinion }
      : (readPredictionDraft(matchId) ?? { pick: null, opinion: "" }),
  );
  const { pick, opinion } = draft;
  const [fieldError, setFieldError] = useState<string | null>(null);

  const { mutate, isPending } = usePredictionCompose(matchId, (failure) => {
    if (keepsComposerOpen(failure.kind)) {
      setFieldError(failure.message);
      return;
    }
    onFailure(failure);
  });

  useEffect(() => {
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isPending, onClose]);

  /* 새로 쓸 때만 임시 저장한다. 픽과 본문이 한 state라 둘을 같은 값으로 적는다 */
  useEffect(() => {
    if (!editing) writePredictionDraft(matchId, draft);
  }, [editing, matchId, draft]);

  if (!mounted) return null;

  const teams = { home: header.home.name, away: header.away.name };
  const length = predictionTextLength(opinion);
  const valid = pick !== null && isPredictionOpinionLengthValid(opinion);

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
    mutate({ pick, opinion: opinion.trim() }, { onSuccess: onClose });
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prediction-composer-title"
    >
      <button
        type="button"
        aria-label="닫기"
        onClick={() => !isPending && onClose()}
        className="bg-dim-strong absolute inset-0"
      />
      <div className="bg-bg border-border-strong shadow-dialog relative w-full max-w-110 border p-6">
        <p
          id="prediction-composer-title"
          className="text-title text-text-strong tracking-heading font-black"
        >
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
                className={`focus-visible:outline-accent flex h-11 min-w-0 items-center justify-center gap-1.5 px-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  on
                    ? "bg-text-strong text-on-accent"
                    : "bg-chip text-text-2 hover:bg-border-strong"
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
          className={`text-body-md text-text-strong placeholder:text-text-4 focus-visible:outline-accent mt-3 block h-30 w-full resize-none border px-3 py-2.75 leading-relaxed focus-visible:outline-2 focus-visible:-outline-offset-1 ${
            fieldError ? "border-text-strong" : "border-border-table"
          }`}
        />
        <div className="flex min-h-4.5 items-baseline gap-2 pt-1.75">
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
        <div className="mt-3.5 flex gap-2.25">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="bg-chip text-text-2 text-body hover:bg-border-strong focus-visible:outline-accent inline-flex h-10 flex-1 items-center justify-center font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
          >
            취소
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!valid || isPending}
            className={`text-body focus-visible:outline-accent inline-flex h-10 flex-2 items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
              valid
                ? "bg-accent text-on-accent hover:bg-accent-hover font-bold"
                : "bg-chip text-text-4 font-medium"
            }`}
          >
            {editing ? "수정" : "예측 등록"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

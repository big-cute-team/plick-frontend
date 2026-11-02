"use client";

import { useState, type RefObject } from "react";
import { classifyPredictionError } from "@plick/core/prediction-errors";
import {
  isPredictionReplyLengthValid,
  PREDICTION_TEXT_MAX_LENGTH,
} from "@plick/domain/prediction";
import { useAuth } from "@/_components/AuthProvider";
import { useCreatePredictionReply } from "@/_hooks/useCreatePredictionReply";

/**
 * 펼친 의견 아래의 답글 입력줄 (KAN-698, 시안 가이드 §5.6, 모바일 `PredictionReplyComposer`의 웹 판).
 * 각진 테두리 인풋 36px + 등록 버튼이고 등록은 한 글자 이상일 때만 초록이다(댓글 입력바와 같은
 * 모양). 값은 호출부가 든다. 답장이 `@닉네임 `을 채우고 포커스해야 해서다.
 *
 * 로그인 분기와 실패 처리는 모바일과 같다. 세션이 없으면 로그인 팝업, 게스트면 연동 안내(답글은
 * 소셜만). 금칙어 400 `PREDICTION_REPLY_BLOCKED`는 입력란에 진한 테두리와 가이드 문구를 남기고
 * 값은 지우지 않는다. 등록 성공은 값을 비우고 목록을 다시 받는다(훅).
 *
 * @param matchId 의견이 달린 경기 id
 * @param predictionId 답글을 달 의견 id
 * @param value 입력값
 * @param onChange 입력값이 바뀔 때
 * @param placeholder 안내 문구(`predictionReplyPlaceholder`)
 * @param inputRef 호출부가 포커스를 주는 ref
 * @param onAuthRequired 로그인이나 연동이 필요할 때. 호출부가 팝업을 띄운다
 */
export function PredictionReplyComposer({
  matchId,
  predictionId,
  value,
  onChange,
  placeholder,
  inputRef,
  onAuthRequired,
}: {
  matchId: number;
  predictionId: number;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onAuthRequired: (mode: "login" | "link") => void;
}) {
  const { isLoggedIn, isGuest, isSessionPending } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const create = useCreatePredictionReply(matchId, predictionId);
  const canSubmit = isPredictionReplyLengthValid(value) && !create.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    if (!isSessionPending) {
      if (!isLoggedIn) {
        onAuthRequired("login");
        return;
      }
      if (isGuest) {
        onAuthRequired("link");
        return;
      }
    }
    setError(null);
    setBlocked(false);
    create.mutate(value.trim(), {
      onSuccess: () => onChange(""),
      onError: (err) => {
        const failure = classifyPredictionError(err);
        if (failure.kind === "login" || failure.kind === "link-account") {
          onAuthRequired(failure.kind === "login" ? "login" : "link");
          return;
        }
        setBlocked(failure.kind === "blocked-word");
        setError(failure.message);
      },
    });
  }

  return (
    <div className="flex flex-col gap-1.5 pt-3">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          aria-label="답글"
          value={value}
          maxLength={PREDICTION_TEXT_MAX_LENGTH}
          onChange={(e) => {
            onChange(e.target.value);
            setBlocked(false);
          }}
          placeholder={placeholder}
          className={`bg-bg text-body text-text placeholder:text-text-4 focus-visible:border-accent h-9 min-w-0 flex-1 border px-3 focus-visible:outline-none ${
            blocked ? "border-text-strong" : "border-border-table"
          }`}
        />
        <button
          type="submit"
          aria-label="답글 등록"
          disabled={!canSubmit}
          className={`text-body focus-visible:outline-accent inline-flex h-9 shrink-0 items-center px-4.5 font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
            canSubmit
              ? "bg-accent text-on-accent hover:bg-accent-hover"
              : "bg-chip text-text-4"
          }`}
        >
          등록
        </button>
      </form>
      {error && <p className="text-caption text-danger-strong px-1">{error}</p>}
    </div>
  );
}

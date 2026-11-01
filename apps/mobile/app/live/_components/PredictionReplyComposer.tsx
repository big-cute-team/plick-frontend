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
 * 의견 상세 화면 하단의 답글 입력바 (KAN-698, 시안 가이드 §5.6). 채운 면 인풋 42px + 등록 버튼이고
 * 등록은 한 글자 이상일 때만 초록이다(댓글 입력줄 `CommentComposer`와 같은 모양). 셸 하단에 붙어
 * 있어 안전영역만큼 아래를 띄운다.
 *
 * 값은 호출부가 든다(제어 컴포넌트). 답장이 입력창에 `@닉네임 `을 채우고 포커스해야 해서
 * 호출부가 값과 ref를 같이 들고 있는 편이 간단하다.
 *
 * 로그인 분기(가이드 §5.6 "비로그인이 등록하면 로그인으로")는 보내기 전에 `useAuth`로 먼저
 * 가른다. 세션이 없으면 로그인, 게스트면 연동 안내다(답글은 소셜만, 티켓 참고). 세션을 아직 모르는
 * 동안은 보내고 서버 응답(401, 403)이 같은 분기를 다시 탄다. 금칙어 400 `PREDICTION_REPLY_BLOCKED`는
 * 입력란에 1px 진한 테두리와 "부적절한 표현이 있어요"를 남기고 값은 지우지 않는다. 등록 성공은
 * 값을 비우고 목록을 다시 받는다(훅).
 *
 * @param matchId 의견이 달린 경기 id
 * @param predictionId 답글을 달 의견 id
 * @param value 입력값
 * @param onChange 입력값이 바뀔 때
 * @param placeholder 안내 문구(`predictionReplyPlaceholder`)
 * @param inputRef 호출부가 포커스를 주는 ref
 * @param onAuthRequired 로그인이나 연동이 필요할 때. 호출부가 시트를 띄운다
 * @param onPosted 등록 성공 뒤. 호출부가 목록 끝으로 내린다
 */
export function PredictionReplyComposer({
  matchId,
  predictionId,
  value,
  onChange,
  placeholder,
  inputRef,
  onAuthRequired,
  onPosted,
}: {
  matchId: number;
  predictionId: number;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onAuthRequired: (mode: "login" | "link") => void;
  onPosted?: () => void;
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
      onSuccess: () => {
        onChange("");
        onPosted?.();
      },
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
    <div
      className="border-border px-edge shrink-0 border-t pt-2.5"
      style={{ paddingBottom: "calc(var(--safe-bottom) + 0.75rem)" }}
    >
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
          className={`bg-input text-body-md text-text placeholder:text-text-4 rounded-control h-10.5 min-w-0 flex-1 border px-3.25 focus-visible:outline-none ${
            blocked ? "border-text-strong" : "border-transparent"
          }`}
        />
        <button
          type="submit"
          aria-label="답글 등록"
          disabled={!canSubmit}
          className={`text-body rounded-control flex h-10.5 shrink-0 items-center px-4.5 font-bold transition-colors active:opacity-60 ${
            canSubmit
              ? "bg-accent text-on-accent"
              : "bg-chip text-text-4 disabled:opacity-100"
          }`}
        >
          등록
        </button>
      </form>
      {error && (
        <p className="text-caption text-danger-strong px-1 pt-1.5">{error}</p>
      )}
    </div>
  );
}

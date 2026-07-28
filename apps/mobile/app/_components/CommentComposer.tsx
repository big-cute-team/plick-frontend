"use client";

import { useEffect, useRef, useState } from "react";
import { SendMiniIcon } from "@plick/ui/icons";
import { ApiError } from "@plick/core/client";
import { COMMENT_MAX_LENGTH } from "@/_constants/comments";
import { useCreateComment } from "@/_hooks/useCreateComment";
import { useAuth } from "./AuthProvider";
import { LoginPromptDialog } from "./LoginPromptDialog";

/**
 * 댓글 입력바 — pill 인풋 + accent 원형 전송 버튼. 기사 세부·릴 세부 시트 공용.
 *
 * 두 자리에서 쓰인다. 화면 하단의 원 댓글 입력바가 기본이고(placeholder는
 * KAN-307로 없앴다), `parentCommentId`가 오면 답글 입력바다 — 유튜브처럼 원 댓글의 "답글"을
 * 누른 자리에 인라인으로 생기며(`CommentThread`), 마운트되자마자 포커스를
 * 받고 취소 버튼이 붙는다. 등록 성공도 `onCancel`로 입력바를 접는다.
 *
 * 비로그인 게이트(KAN-303 티켓 요구): 인풋에 포커스가 오거나 제출하려 하면
 * 로그인 유도 팝업을 띄우고 입력 자체를 막는다. 로그인 여부는 서버가 심어 준
 * `AuthProvider` 컨텍스트로 읽는다 — 쿠키가 HttpOnly라 클라가 직접 못 본다.
 * 쿠키는 있는데 토큰이 만료된 경우는 제출 때 401 `AUTH_REQUIRED`로 드러나므로
 * 같은 팝업으로 받는다.
 *
 * 글자수는 BE 검증(1~500자)을 클라에서 미리 건다 — `maxLength`로 초과 입력을
 * 막고, 공백만 입력은 전송을 건너뛴다. 그 밖의 실패(BE 거절·순단)는 입력바
 * 밑에 문구로 보여주고 입력값은 남겨 다시 보낼 수 있게 한다.
 *
 * @param articleId 댓글을 달 기사(릴) id
 * @param parentCommentId 답글이면 원 댓글 id. 없으면 원 댓글 작성 모드
 * @param onCancel 답글 입력바를 접을 때(취소 탭·등록 성공) 호출
 * @param onPosted 등록 성공 시 호출 — 호출부가 헤더 카운트를 올리는 데 쓴다
 * @param className 래퍼에 덧붙일 클래스(여백 등)
 */
export function CommentComposer({
  articleId,
  parentCommentId,
  onCancel,
  onPosted,
  className = "",
}: {
  articleId: string;
  parentCommentId?: number;
  onCancel?: () => void;
  onPosted?: () => void;
  className?: string;
}) {
  const { isLoggedIn } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mutate, isPending } = useCreateComment(articleId, onPosted);

  const isReply = parentCommentId != null;

  /* 답글 입력바는 "답글"을 누른 순간 생기므로 바로 입력을 시작하게 포커스한다 */
  useEffect(() => {
    if (isReply) inputRef.current?.focus();
  }, [isReply]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoggedIn) {
      setShowLogin(true);
      return;
    }
    const content = value.trim();
    if (!content || isPending) return;

    setError(null);
    mutate(
      { content, parentCommentId },
      {
        onSuccess: () => {
          setValue("");
          onCancel?.();
        },
        onError: (err) => {
          if (err instanceof ApiError && err.code === "AUTH_REQUIRED") {
            setShowLogin(true);
            return;
          }
          // BE 메시지가 이미 사용자용 한국어다(예: "공백일 수 없습니다")
          setError(
            err instanceof ApiError
              ? err.message
              : "댓글을 등록하지 못했어요. 잠시 후 다시 시도해 주세요.",
          );
        },
      },
    );
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <form onSubmit={handleSubmit} className="flex items-center gap-2.5">
        <input
          ref={inputRef}
          type="text"
          value={value}
          maxLength={COMMENT_MAX_LENGTH}
          onChange={(e) => setValue(e.target.value)}
          onFocus={(e) => {
            if (!isLoggedIn) {
              e.currentTarget.blur();
              setShowLogin(true);
            }
          }}
          placeholder={isReply ? "답글 남기기…" : undefined}
          className={`bg-elevate-2 border-border text-body text-text placeholder:text-text-4 rounded-pill min-w-0 flex-1 border px-4 focus-visible:outline-none ${
            isReply ? "h-9.5" : "h-11"
          }`}
        />
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-label text-text-3 shrink-0 font-semibold active:opacity-60"
          >
            취소
          </button>
        )}
        <button
          type="submit"
          aria-label={isReply ? "답글 등록" : "댓글 등록"}
          disabled={isPending}
          className={`bg-accent text-on-accent grid shrink-0 place-items-center rounded-full active:opacity-60 disabled:opacity-40 ${
            isReply ? "size-9.5" : "size-11"
          }`}
        >
          <SendMiniIcon size={isReply ? 15 : 17} />
        </button>
      </form>

      {error && <p className="text-caption text-danger px-1">{error}</p>}

      {showLogin && <LoginPromptDialog onClose={() => setShowLogin(false)} />}
    </div>
  );
}

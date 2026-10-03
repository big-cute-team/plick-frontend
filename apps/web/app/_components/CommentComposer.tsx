"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError, needsSocialAccount } from "@plick/core/client";
import { COMMENT_MAX_LENGTH } from "@plick/core/comments";
import { useCreateComment } from "@/_hooks/useCreateComment";
import { useAuth } from "./AuthProvider";
import { LoginPromptDialog } from "./LoginPromptDialog";

/**
 * 댓글 입력바 (시안 KAN-567) — 각진 테두리 인풋 38px + 채운 면 "등록" 버튼. 기사
 * 세부·릴 세부 패널 공용. 알약 인풋과 원형 전송 아이콘이었는데 시안이 각진
 * 표 테두리(`border-table`)와 글자 버튼이라 바꿨다. 등록·투표·보내기 같은
 * 확정 행동만 채운 면이라는 시안 규칙의 그 채운 면이다.
 * 표시는 KAN-323까지의 퍼블리싱에서 왔고, KAN-329에서 작성 API를 물렸다.
 *
 * 두 자리에서 쓰인다. 댓글 헤더 밑의 원 댓글 입력바가 기본이고, `parentCommentId`가
 * 오면 답글 입력바다 — 유튜브처럼 원 댓글의 "답글"을 누른 자리에 인라인으로
 * 생기며(`CommentThread`), 마운트되자마자 포커스를 받고 취소 버튼이 붙는다.
 * 시안대로 34px로 낮고 왼쪽에 22px 들여쓰며 placeholder는 "OOO님에게 답글"이다.
 * 등록 성공도 `onCancel`로 입력바를 접는다.
 *
 * 비로그인 게이트: 인풋에 포커스가 오거나 제출하려 하면 로그인 유도 팝업을 띄우고
 * 입력 자체를 막는다. 로그인 여부는 서버가 심어 준 `AuthProvider` 컨텍스트로
 * 읽는다 — 쿠키가 HttpOnly라 클라가 직접 못 본다. 쿠키는 있는데 토큰이 만료된
 * 경우는 제출 때 401 `AUTH_REQUIRED`로 드러나므로 같은 팝업으로 받는다.
 *
 * 글자수는 BE 검증(1~500자)을 클라에서 미리 건다 — `maxLength`로 초과 입력을
 * 막고, 공백만 입력은 전송을 건너뛴다. 그 밖의 실패(BE 거절·순단)는 입력바
 * 밑에 문구로 보여주고 입력값은 남겨 다시 보낼 수 있게 한다.
 *
 * @param articleId 댓글을 달 기사(릴) id
 * @param parentCommentId 답글이면 원 댓글 id. 없으면 원 댓글 작성 모드
 * @param replyTo 답글이면 원 댓글 작성자 닉네임. placeholder에 쓴다
 * @param onCancel 답글 입력바를 접을 때(취소 클릭·등록 성공) 호출
 * @param onPosted 등록 성공 시 호출 — 호출부가 헤더 카운트를 올리는 데 쓴다
 * @param className 래퍼에 덧붙일 클래스(여백 등)
 */
export function CommentComposer({
  articleId,
  parentCommentId,
  replyTo,
  onCancel,
  onPosted,
  className = "",
}: {
  articleId: string;
  parentCommentId?: number;
  replyTo?: string;
  onCancel?: () => void;
  onPosted?: () => void;
  className?: string;
}) {
  const { isLoggedIn, isGuest } = useAuth();
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
    if (!isLoggedIn || isGuest) {
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
          if (needsSocialAccount(err)) {
            setShowLogin(true);
            return;
          }
          // BE 메시지가 이미 사용자용 한국어다(예: "공백일 수 없습니다")
          setError(
            err instanceof ApiError
              ? err.message
              : "댓글을 등록하지 못했어요. 잠시 후 다시 시도해 주세요",
          );
        },
      },
    );
  }

  const height = isReply ? "h-8.5" : "h-9.5";

  return (
    <div
      className={`flex flex-col gap-1.5 ${isReply ? "ml-5.5" : ""} ${className}`}
    >
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          aria-label={isReply ? "답글 입력" : "댓글 입력"}
          value={value}
          maxLength={COMMENT_MAX_LENGTH}
          onChange={(e) => setValue(e.target.value)}
          onFocus={(e) => {
            if (!isLoggedIn || isGuest) {
              e.currentTarget.blur();
              setShowLogin(true);
            }
          }}
          placeholder={
            isReply
              ? replyTo
                ? `${replyTo}님에게 답글`
                : "답글 입력"
              : "댓글 입력"
          }
          className={`border-border-table text-text placeholder:text-text-4 focus-visible:border-accent min-w-0 flex-1 border focus-visible:outline-none ${height} ${
            isReply ? "text-label px-2.75" : "text-label-lg px-3"
          }`}
        />
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className={`text-label text-text-3 hover:text-text-strong focus-visible:outline-accent inline-flex shrink-0 items-center px-3.5 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 ${height}`}
          >
            취소
          </button>
        )}
        <button
          type="submit"
          disabled={isPending}
          className={`bg-accent text-on-accent hover:bg-accent-hover focus-visible:outline-accent inline-flex shrink-0 items-center font-bold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40 ${height} ${
            isReply ? "text-label px-4" : "text-label-lg px-5"
          }`}
        >
          등록
        </button>
      </form>

      {error && <p className="text-caption text-danger">{error}</p>}

      {showLogin && <LoginPromptDialog onClose={() => setShowLogin(false)} />}
    </div>
  );
}

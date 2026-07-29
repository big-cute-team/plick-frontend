"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError } from "@plick/core/client";
import { COMMENT_MAX_LENGTH } from "@plick/core/comments";
import type { ArticleComment } from "@plick/domain/types";
import { useUpdateComment } from "@/_hooks/useUpdateComment";
import { LoginPromptDialog } from "./LoginPromptDialog";

/**
 * 댓글 인라인 수정 폼 (KAN-333, 모바일 이식) — 내 댓글의 "수정"을 누르면 본문
 * 자리에 나타난다. 입력 스타일과 글자수 제한, 에러 표시는 작성 입력바
 * (`CommentComposer`)와 같은 관용이고, 전송 대신 저장·취소 텍스트 버튼을 쓴다.
 * 데스크톱이라 hover·focus 스타일을 얹는다.
 *
 * 저장 성공은 뮤테이션(`useUpdateComment`)이 목록 캐시를 고치므로 폼만 닫으면
 * 바뀐 본문이 그려진다. 토큰 만료로 401 `AUTH_REQUIRED`가 오면 작성과 같은
 * 로그인 유도 팝업을 띄운다.
 *
 * @param comment 수정할 댓글(대댓글) — 기존 본문을 초깃값으로 채운다
 * @param articleId 이 댓글이 달린 기사(릴) id — 목록 캐시 갱신에 쓴다
 * @param onClose 폼을 접을 때(취소 클릭·저장 성공) 호출
 */
export function CommentEditForm({
  comment,
  articleId,
  onClose,
}: {
  comment: ArticleComment;
  articleId: string;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(comment.content ?? "");
  const [showLogin, setShowLogin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mutate, isPending } = useUpdateComment(articleId);

  /* "수정"을 누른 순간 생기므로 바로 이어서 고치게 포커스한다 */
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const content = value.trim();
    if (!content || isPending) return;

    setError(null);
    mutate(
      { commentId: comment.id, content },
      {
        onSuccess: onClose,
        onError: (err) => {
          if (err instanceof ApiError && err.code === "AUTH_REQUIRED") {
            setShowLogin(true);
            return;
          }
          // BE 메시지가 이미 사용자용 한국어다(예: "본인 댓글만 수정·삭제할 수 있습니다.")
          setError(
            err instanceof ApiError
              ? err.message
              : "댓글을 수정하지 못했어요. 잠시 후 다시 시도해 주세요.",
          );
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <form onSubmit={handleSubmit} className="flex items-center gap-2.5">
        <input
          ref={inputRef}
          type="text"
          value={value}
          maxLength={COMMENT_MAX_LENGTH}
          onChange={(e) => setValue(e.target.value)}
          aria-label="댓글 수정"
          className="bg-elevate-2 border-border text-body text-text focus-visible:border-border-strong rounded-pill h-9.5 min-w-0 flex-1 border px-4 focus-visible:outline-none"
        />
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="text-label text-text-3 hover:text-text-2 focus-visible:outline-accent shrink-0 rounded font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isPending || !value.trim()}
          className="text-label text-accent focus-visible:outline-accent shrink-0 rounded font-semibold hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
        >
          저장
        </button>
      </form>

      {error && <p className="text-caption text-danger px-1">{error}</p>}

      {showLogin && <LoginPromptDialog onClose={() => setShowLogin(false)} />}
    </div>
  );
}

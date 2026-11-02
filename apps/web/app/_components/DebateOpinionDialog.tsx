"use client";

import { useEffect, useState } from "react";
import { ApiError, needsSocialAccount } from "@plick/core/client";
import { COMMENT_MAX_LENGTH } from "@plick/core/comments";
import { isDebateClosed } from "@plick/domain/format";
import type { Debate, VoteOption } from "@plick/domain/types";
import { VoteCard } from "@plick/ui/VoteCard";
import { useCreateComment } from "@/_hooks/useCreateComment";
import { LoginPromptDialog } from "./LoginPromptDialog";
import { createPortal } from "react-dom";

/** 참여하기 또는 첫 투표 성공에서 여는 창. 선택 즉시 투표하고 의견은 선택 사항이다. */
export function DebateOpinionDialog({
  articleId,
  debate,
  onVote,
  votePending,
  closed,
  onClose,
}: {
  articleId: string;
  debate: Debate;
  onVote: (option: VoteOption) => void;
  votePending: boolean;
  closed: boolean;
  onClose: () => void;
}) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const { mutate, isPending } = useCreateComment(articleId);
  const pending = votePending || isPending;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [pending, onClose]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!content.trim() || pending || debate.myVote === null) return;
    if (closed || isDebateClosed(debate.closesAt)) {
      setError("투표가 마감됐어요. 의견은 아래 댓글에서 남겨 주세요.");
      return;
    }
    setError(null);
    mutate(
      { content: content.trim() },
      {
        onSuccess: onClose,
        onError: (reason) => {
          if (needsSocialAccount(reason)) {
            setShowLogin(true);
            return;
          }
          setError(
            reason instanceof ApiError
              ? reason.message
              : "의견을 등록하지 못했어요. 다시 시도해 주세요.",
          );
        },
      },
    );
  }

  const body = (
    <>
      <h2 className="text-title text-text-strong tracking-heading font-black">
        {debate.myVote === null
          ? "어느 쪽에 투표하시겠어요?"
          : "왜 그렇게 선택하셨나요?"}
      </h2>
      <p className="text-body text-text-3 mt-2">
        {debate.myVote === null
          ? "선택지를 눌러 투표하고, 이유도 댓글로 남겨 주세요."
          : "선택한 이유를 댓글로 남겨 주세요. 선택도 바꿀 수 있어요."}
      </p>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
        <VoteCard
          debate={debate}
          onVote={onVote}
          isPending={pending}
          closed={closed}
          size="sm"
        />
        <textarea
          aria-label="투표 의견"
          value={content}
          onChange={(event) => {
            setContent(event.target.value);
            setError(null);
          }}
          maxLength={COMMENT_MAX_LENGTH}
          disabled={isPending}
          placeholder="이렇게 선택한 이유는..."
          className="bg-input text-body text-text-strong placeholder:text-text-4 rounded-control focus-visible:outline-accent h-24 w-full resize-none px-3 py-3 focus-visible:outline-2"
        />
        <p className="text-label text-text-4 text-right tabular-nums">
          {content.length}/{COMMENT_MAX_LENGTH}
        </p>
        {error && (
          <p role="alert" className="text-body text-danger-strong">
            {error}
          </p>
        )}
        {closed && (
          <p role="status" className="text-body text-text-3">
            투표가 마감됐어요. 의견은 아래 댓글에서 남겨 주세요.
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="bg-chip text-text-2 text-body rounded-control h-11 flex-1 font-bold disabled:opacity-40"
          >
            {debate.myVote === null ? "닫기" : "나중에"}
          </button>
          <button
            type="submit"
            disabled={
              pending || closed || debate.myVote === null || !content.trim()
            }
            className="bg-accent text-on-accent text-body rounded-control h-11 flex-1 font-bold disabled:opacity-40"
          >
            의견 등록
          </button>
        </div>
      </form>
    </>
  );

  if (showLogin)
    return <LoginPromptDialog onClose={() => setShowLogin(false)} />;
  if (!mounted) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-8"
      role="dialog"
      aria-modal="true"
      aria-label="투표 의견 작성"
    >
      <button
        type="button"
        aria-label="닫기"
        onClick={() => !pending && onClose()}
        className="bg-dim-strong absolute inset-0"
      />
      <div className="bg-bg border-border-strong shadow-dialog relative max-h-[90dvh] w-full max-w-110 overflow-y-auto border p-6">
        {body}
      </div>
    </div>,
    document.body,
  );
}

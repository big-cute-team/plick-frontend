"use client";

import type { ReactNode } from "react";
import { useMutationState } from "@tanstack/react-query";
import { debateKeys } from "@plick/core/debateKeys";
import type { Debate, DebateVoteState } from "@plick/domain/types";
import { PARTICIPATION_NOTICE } from "@plick/domain/vs";
import { useDebateClock } from "@plick/core/use-debate-clock";
import { useMyArticleState } from "@/_hooks/useMyArticleState";

/** 투표 게시물은 참여하거나 마감된 뒤에만 댓글 조회·작성 UI를 마운트한다. */
export function DebateParticipationGate({
  articleId,
  debate,
  closed = false,
  children,
}: {
  articleId: string;
  debate?: Debate | null;
  closed?: boolean;
  children: ReactNode;
}) {
  if (!debate) return children;
  return (
    <GatedComments articleId={articleId} debate={debate} closed={closed}>
      {children}
    </GatedComments>
  );
}
function GatedComments({
  articleId,
  debate,
  closed,
  children,
}: {
  articleId: string;
  debate: Debate;
  closed: boolean;
  children: ReactNode;
}) {
  const { vote } = useMyArticleState(articleId);
  const now = useDebateClock([debate]);
  // 첫 투표의 낙관적 갱신으로 댓글을 미리 조회하지 않는다.
  const firstVotePending = useMutationState({
    filters: { mutationKey: debateKeys.vote(debate.id), status: "pending" },
    select: (mutation) =>
      (mutation.state.context as DebateVoteState | undefined)?.myVote ?? null,
  }).some((previousVote) => previousVote === null);
  if (
    closed ||
    (vote !== null && !firstVotePending) ||
    (debate.closesAt !== null && new Date(debate.closesAt).getTime() <= now)
  )
    return children;
  function goToVote() {
    const card = document.getElementById(`debate-vote-${articleId}`);
    card?.scrollIntoView({ behavior: "smooth", block: "center" });
    card
      ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
      ?.focus({ preventScroll: true });
  }
  return (
    <div className="relative my-5 overflow-hidden py-8">
      <div
        aria-hidden
        className="pointer-events-none flex flex-col gap-4 blur-sm"
      >
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <span className="bg-border rounded-pill h-3 w-20" />
            <span className="bg-border rounded-pill h-3 w-4/5" />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <p className="text-body text-text-strong font-bold">
          {PARTICIPATION_NOTICE}
        </p>
        <button
          type="button"
          onClick={goToVote}
          className="bg-accent text-on-accent rounded-control min-h-11 px-5 font-bold"
        >
          참여하기
        </button>
      </div>
    </div>
  );
}

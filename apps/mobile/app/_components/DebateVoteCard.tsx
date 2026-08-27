"use client";

import { useState } from "react";
import type { Debate, DebateVoteState } from "@plick/domain/types";
import { VoteCard } from "@plick/ui/VoteCard";
import { LoginPromptDialog } from "@/_components/LoginPromptDialog";
import { VOTE_LOGIN_PROMPT } from "@/_constants/debates";
import { useDebateVote } from "@/_hooks/useDebateVote";

/**
 * 투표 가능한 투표 카드 (KAN-418) — 표시 전용 `VoteCard`에 뮤테이션·로그인
 * 게이트를 묶은 클라 경계. 기사 세부(`ArticleBody`)와 릴 세부 시트가 같이 쓴다.
 *
 * 집계 상태를 여기 state로 든다 — 기사 세부는 서버가 준 props가 원본이라 이
 * state가 곧 화면이고(좋아요 `ArticleLikeButton`과 같은 판단), 릴 세부는 쿼리
 * 캐시가 원본이지만 훅이 `syncDebateVote`로 캐시를 함께 맞추므로 이 state는
 * 이 카드가 떠 있는 동안의 표시용 사본으로 같은 값을 유지한다.
 *
 * @param debate 서버(또는 피드 캐시)가 내려준 최초 토론 상태
 * @param closed 마감된 토론인가(기사 `contentType === "FINISH"`). 릴 세부는
 *   BE가 열린 토론만 인라인으로 줘서 넘길 일이 없다.
 * @param size `VoteCard` 크기 — 기사·릴 세부는 md(기본)
 */
export function DebateVoteCard({
  debate: initial,
  closed = false,
  size,
}: {
  debate: Debate;
  closed?: boolean;
  size?: "md" | "sm";
}) {
  const [voteState, setVoteState] = useState<DebateVoteState>({
    voteCountA: initial.voteCountA,
    voteCountB: initial.voteCountB,
    myVote: initial.myVote,
  });
  const debate: Debate = { ...initial, ...voteState };
  const { vote, isPending, needsLogin, dismissLogin } = useDebateVote({
    debate,
    onChange: setVoteState,
  });

  return (
    <>
      <VoteCard
        debate={debate}
        closed={closed}
        onVote={vote}
        isPending={isPending}
        size={size}
      />
      {needsLogin && (
        <LoginPromptDialog
          onClose={dismissLogin}
          description={VOTE_LOGIN_PROMPT}
        />
      )}
    </>
  );
}

"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { setMyArticleState } from "@plick/core/article-states";
import type { Debate } from "@plick/domain/types";
import { VoteCard } from "@plick/ui/VoteCard";
import { VOTE_LOGIN_PROMPT } from "@/_constants/debates";
import { useDebateVote } from "@/_hooks/useDebateVote";
import { useMyArticleState } from "@/_hooks/useMyArticleState";

/**
 * LoginPromptDialog는 탭해야 뜨는 조건부 UI라 초기 번들에서 뺀다 (KAN-428).
 */
const LoginPromptDialog = dynamic(
  () =>
    import("@/_components/LoginPromptDialog").then((m) => m.LoginPromptDialog),
  { ssr: false },
);

/**
 * 투표 가능한 투표 카드 (KAN-418) — 표시 전용 `VoteCard`에 뮤테이션·로그인
 * 게이트를 묶은 클라 경계. 기사 세부(`ArticleBody`)와 릴 세부 시트가 같이 쓴다.
 *
 * 집계(표 수)를 여기 state로 든다 — 기사 세부는 서버가 준 props가 원본이라 이
 * state가 곧 화면이고(좋아요 `ArticleLikeButton`과 같은 판단), 릴 세부는 쿼리
 * 캐시가 원본이지만 훅이 `syncDebateVote`로 캐시를 함께 맞추므로 이 state는
 * 이 카드가 떠 있는 동안의 표시용 사본으로 같은 값을 유지한다.
 *
 * 내 표는 다르다 (KAN-664). 세 화면 모두 익명 ISR이라 받은 토론의 `myVote`는 늘 null이고,
 * 내 상태 캐시(`useMyArticleState`)가 원본이다. 투표하면 그 캐시에 바로 적는다. 결과 공개가
 * 이 값에 걸려 있어 응답 전에는 투표 전 모양으로 보이다가 내 표가 오면 결과로 바뀐다.
 *
 * @param articleId 토론이 붙은 기사 id. 내 표를 이 기사로 찾는다
 * @param debate 서버(또는 피드 캐시)가 내려준 최초 토론 상태
 * @param closed 마감된 토론인가(`contentType === "FINISH"`). 기사·릴 세부
 *   모두 같은 기준으로 넘긴다 — 마감이면 결과 읽기 전용이다.
 * @param size `VoteCard` 크기 — 기사·릴 세부는 md(기본)
 */
export function DebateVoteCard({
  articleId,
  debate: initial,
  closed = false,
  size,
}: {
  articleId: string;
  debate: Debate;
  closed?: boolean;
  size?: "md" | "sm";
}) {
  const queryClient = useQueryClient();
  const [counts, setCounts] = useState({
    voteCountA: initial.voteCountA,
    voteCountB: initial.voteCountB,
  });
  const { vote: myVote } = useMyArticleState(articleId);
  const debate: Debate = { ...initial, ...counts, myVote };
  const { vote, isPending, needsLogin, dismissLogin, closedByServer } =
    useDebateVote({
      debate,
      onChange: ({ voteCountA, voteCountB, myVote: next }) => {
        setCounts({ voteCountA, voteCountB });
        setMyArticleState(queryClient, articleId, { vote: next });
      },
    });

  return (
    <>
      <VoteCard
        debate={debate}
        closed={closed || closedByServer}
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

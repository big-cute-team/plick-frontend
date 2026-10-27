"use client";

import { useQueryClient } from "@tanstack/react-query";
import { setMyArticleState } from "@plick/core/article-states";
import type { Debate } from "@plick/domain/types";
import { VoteCard } from "@plick/ui/VoteCard";
import { LoginPromptDialog } from "@/_components/LoginPromptDialog";
import { VOTE_LOGIN_PROMPT } from "@/_constants/debates";
import { useDebateVote } from "@/_hooks/useDebateVote";
import { useMyArticleState } from "@/_hooks/useMyArticleState";

/**
 * 투표 가능한 투표 카드 (KAN-418, 시안 W14·W15) — 표시 전용 `VoteCard`에
 * 뮤테이션·로그인 게이트를 묶은 클라 경계. 기사 세부와 릴 세부 패널, 투표 목록이
 * 같이 쓴다. 모바일 `DebateVoteCard`의 웹 이식이다 — 로그인 게이트·서버 액션이
 * 앱 로컬이라 컴포넌트째 복제한다(댓글과 같은 판단).
 *
 * 집계(표 수)는 props가 원본이고 이 카드는 들지 않는다 (KAN-681, 모바일과 같다). 세 화면
 * 모두 쿼리 캐시가 원본이다. 투표 목록은 리스트 캐시, 릴 패널은 피드 캐시, 기사 세부는
 * 기사별 토론 캐시(`useArticleDebate`). `useDebateVote`가 낙관 갱신·확정·롤백 때마다
 * `syncDebateVote`로 셋을 함께 고치므로 props가 곧 화면이다. 전에는 처음 받은 props를
 * state로 복사해 들어서 리스트를 다시 받아도 떠 있던 카드의 숫자가 안 바뀌었다.
 *
 * 내 표는 다르다 (KAN-667, 모바일 KAN-664). 세 화면 모두 익명 ISR이라 받은 토론의 `myVote`는
 * 늘 null이고, 내 상태 캐시(`useMyArticleState`)가 원본이다. 투표하면 그 캐시에 바로 적는다.
 * 결과 공개가 이 값에 걸려 있어 응답 전에는 투표 전 모양으로 보이다가 내 표가 오면 결과로 바뀐다.
 * 마감 카드도 같은 길이다. 내 표 표시만 캐시에서 얹고 투표는 막혀 있다.
 *
 * @param articleId 토론이 붙은 기사 id. 내 표를 이 기사로 찾는다
 * @param debate 쿼리 캐시가 들고 있는 토론. 집계는 이 값을 그대로 그린다
 * @param closed 마감된 토론인가(기사 `contentType === "FINISH"`)
 * @param size `VoteCard` 크기 — 기사 세부는 md(기본)
 */
export function DebateVoteCard({
  articleId,
  debate: source,
  closed = false,
  size,
}: {
  articleId: string;
  debate: Debate;
  closed?: boolean;
  size?: "md" | "sm";
}) {
  const queryClient = useQueryClient();
  const { vote: myVote } = useMyArticleState(articleId);
  const debate: Debate = { ...source, myVote };
  const { vote, isPending, needsLogin, dismissLogin, closedByServer } =
    useDebateVote({
      debate,
      /* 집계는 훅이 `syncDebateVote`로 캐시에 직접 쓴다. 여기서는 내 표만 적는다 */
      onChange: ({ myVote: next }) => {
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

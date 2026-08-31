"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@plick/core/client";
import { syncDebateVote } from "@plick/core/debate-sync";
import type { Debate, DebateVoteState, VoteOption } from "@plick/domain/types";
import { useAuth } from "@/_components/AuthProvider";
import { voteDebate } from "@/_services/debate-actions";

/**
 * 토론 투표 뮤테이션 (KAN-418) — `useLikeToggle`과 같은 뼈대다.
 *
 * 상태를 이 훅이 들지 않고 `onChange`로 호출부에 되돌려주는 이유도 같다 —
 * 원본이 화면마다 다르다(릴 세부는 쿼리 캐시, 기사 세부는 서버 props →
 * 컴포넌트 state). 여기에 더해 같은 토론이 토론 리스트·릴스 피드 캐시에도
 * 살아 있어, 갱신·확정·롤백 때마다 `syncDebateVote`로 캐시까지 함께 맞춘다.
 *
 * 낙관적 갱신은 누르는 즉시 내 표를 옮긴다 — 처음이면 고른 쪽 +1, 입장 변경이면
 * 이전 쪽 -1에 새 쪽 +1. 응답이 오면 BE 집계로 덮는다(그 사이 다른 사람 표까지
 * 반영). 실패하면 누르기 직전 값으로 되돌리고, 비로그인·만료(401)는 로그인 유도
 * 팝업으로 받는다. 같은 선택지를 또 누르는 건 보내지 않는다 — 멱등이라 서버는
 * 무해하지만 왕복할 이유가 없다.
 *
 * @param debate 지금 보고 있는 토론(원본에서 읽은 값)
 * @param onChange 낙관적 갱신·서버 확정·롤백 때마다 새 집계로 호출된다.
 *   호출부가 원본(캐시나 state)에 그대로 반영한다. 원본이 쿼리 캐시뿐이면
 *   (릴 세부) 생략해도 된다 — 캐시는 훅이 직접 맞춘다.
 */
export function useDebateVote({
  debate,
  onChange,
}: {
  debate: Debate;
  onChange?: (next: DebateVoteState) => void;
}) {
  const queryClient = useQueryClient();
  const { isLoggedIn } = useAuth();
  const [needsLogin, setNeedsLogin] = useState(false);

  function apply(next: DebateVoteState) {
    onChange?.(next);
    syncDebateVote(queryClient, debate.id, next);
  }

  const { mutate, isPending } = useMutation({
    mutationFn: async (option: VoteOption) => {
      const result = await voteDebate(debate.id, option);
      if (!result.ok) {
        throw new ApiError(result.status, result.code, result.message);
      }
      return result.result;
    },
    onMutate: (option) => {
      const previous: DebateVoteState = {
        voteCountA: debate.voteCountA,
        voteCountB: debate.voteCountB,
        myVote: debate.myVote,
      };
      const delta = (side: VoteOption) =>
        (option === side ? 1 : 0) - (previous.myVote === side ? 1 : 0);
      apply({
        voteCountA: previous.voteCountA + delta("OPTION_A"),
        voteCountB: previous.voteCountB + delta("OPTION_B"),
        myVote: option,
      });
      return previous;
    },
    onSuccess: (result) => apply(result),
    onError: (e, _option, previous) => {
      if (previous) apply(previous);
      if (e instanceof ApiError && e.code === "AUTH_REQUIRED") {
        setNeedsLogin(true);
        return;
      }
      console.error("[debates] 투표 반영 실패:", e);
    },
  });

  return {
    /** 선택지를 눌렀을 때. 응답 대기 중·같은 선택지 재탭은 무시한다 */
    vote: (option: VoteOption) => {
      if (!isLoggedIn) {
        setNeedsLogin(true);
        return;
      }
      if (isPending || option === debate.myVote) return;
      mutate(option);
    },
    isPending,
    /** 로그인 유도 팝업을 띄워야 하는가 (비로그인 탭 또는 401) */
    needsLogin,
    dismissLogin: () => setNeedsLogin(false),
  };
}

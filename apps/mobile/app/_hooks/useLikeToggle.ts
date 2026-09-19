"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ApiError } from "@plick/core/client";
import type { LikeState, ToggleLikeResult } from "@plick/domain/types";
import { useAuth } from "@/_components/AuthProvider";

/**
 * 좋아요 토글의 공통 뼈대 (KAN-308에서 기사·릴용으로 짜고 KAN-309에서 댓글이
 * 두 번째 사용처가 되면서 떼어냈다). 도메인별 훅(`useArticleLike`·
 * `useCommentLike`)이 서버 액션과 원본 갱신만 물려 쓴다.
 *
 * 상태를 이 훅이 들고 있지 않고 `onChange`로 호출부에 되돌려주는 이유는 좋아요의
 * 원본이 화면마다 다른 데 있다. 릴스와 댓글은 쿼리 캐시가 원본이라 캐시를 고쳐야
 * 넘겼다 돌아와도 유지되고, 기사 세부는 서버가 내려준 props가 원본이라 컴포넌트
 * state로 받는다. 훅이 자기 state를 들면 둘 중 하나는 원본과 어긋난다.
 *
 * 낙관적 갱신은 누르는 즉시 `onChange`로 하트를 채우고 카운트를 ±1 한다. 응답이
 * 오면 BE가 계산한 카운트로 덮는다 — 그 사이 다른 사람이 누른 것까지 반영된다.
 * 실패하면 누르기 직전 값으로 되돌린다. 되돌릴 값은 `onMutate`가 그때 찍어
 * 컨텍스트로 넘긴다 — 렌더가 이미 낙관적 값으로 지나간 뒤라 클로저에 남은
 * `state`를 쓰면 낙관적 값으로 "되돌리는" 꼴이 된다.
 *
 * 응답이 오기 전 다시 못 누르게 막는다(`isPending`). API가 멱등이라 순서가
 * 뒤집혀도 서버 상태는 망가지지 않지만, 늦게 온 응답의 카운트가 화면을 덮으면
 * 표시가 튄다.
 *
 * 로그인하지 않았으면 요청을 보내지 않고 로그인 유도 팝업을 띄운다. 로그인 여부는
 * 서버가 심어 준 `AuthProvider`로 읽는다 — 쿠키가 HttpOnly라 클라가 직접 못 본다.
 * 쿠키는 있는데 토큰이 만료된 경우는 401 `AUTH_REQUIRED`로 드러나므로 같은 팝업으로
 * 받는다(댓글 입력바와 같은 방식).
 *
 * 그 밖의 실패(없는 대상, 네트워크 순단)는 되돌린 뒤 전역 안전망(KAN-447,
 * QueryProvider의 MutationCache onError)이 토스트로 알린다. 예전엔 콘솔에만
 * 남겨 화면이 무반응이었다 — 모달은 좋아요 한 번에 과하다는 판단은 유지하되,
 * 지나가는 한 줄로는 실패를 알린다.
 *
 * @param toggle 누른 뒤 부를 서버 액션. 켤 때 true, 끌 때 false로 호출된다
 * @param state 지금 보고 있는 좋아요 상태(원본에서 읽은 값)
 * @param onChange 낙관적 갱신·서버 확정·롤백 때마다 새 상태로 호출된다.
 *   호출부가 원본(캐시나 state)에 그대로 반영한다
 */
export function useLikeToggle({
  toggle,
  state,
  onChange,
}: {
  toggle: (liked: boolean) => Promise<ToggleLikeResult>;
  state: LikeState;
  onChange: (next: LikeState) => void;
}) {
  const { isLoggedIn } = useAuth();
  const [needsLogin, setNeedsLogin] = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: async (liked: boolean) => {
      const result = await toggle(liked);
      if (!result.ok) {
        throw new ApiError(result.status, result.code, result.message);
      }
      return result.likeCount;
    },
    onMutate: (liked) => {
      const previous = state;
      onChange({
        liked,
        // BE 카운트가 0인데 liked만 true인 어긋난 데이터가 와도 음수로 안 내려간다
        likeCount: Math.max(0, state.likeCount + (liked ? 1 : -1)),
      });
      return previous;
    },
    onSuccess: (likeCount, liked) => onChange({ liked, likeCount }),
    onError: (e, _liked, previous) => {
      if (previous) onChange(previous);
      /* 그 밖의 실패 안내는 전역 안전망(토스트)이 맡는다 (KAN-447) */
      if (e instanceof ApiError && e.code === "AUTH_REQUIRED") {
        setNeedsLogin(true);
      }
    },
  });

  return {
    /** 하트를 눌렀을 때. 응답 대기 중이면 무시한다 */
    toggle: () => {
      if (!isLoggedIn) {
        setNeedsLogin(true);
        return;
      }
      if (isPending) return;
      mutate(!state.liked);
    },
    isPending,
    /** 로그인 유도 팝업을 띄워야 하는가 (비로그인 탭 또는 401) */
    needsLogin,
    dismissLogin: () => setNeedsLogin(false),
  };
}

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { refreshMyArticleState } from "@plick/core/article-state-cache";
import type { LikeState } from "@plick/domain/types";
import { useLikeToggle } from "@/_hooks/useLikeToggle";
import { likeArticle, unlikeArticle } from "@/_services/article-likes";

/**
 * 기사·릴 좋아요 토글 (KAN-308, web 이식 KAN-330). 릴 액션 레일과 기사 세부
 * 버튼이 함께 쓴다.
 *
 * 두 화면은 생김새가 완전히 다르지만(원형 칩 레일 vs 알약 버튼) 눌렀을 때 할 일은
 * 같다. 그래서 버튼을 공용화하지 않고 이 훅만 공유한다(ADR 0011 게이트 B).
 *
 * 낙관적 갱신·롤백·로그인 유도는 {@link useLikeToggle}이 들고 있다. 여기 남은 건
 * 기사 엔드포인트를 물리는 일뿐이다.
 *
 * @param articleId 기사(릴) id — 릴스와 기사가 같은 `articleSummaryId` 체계다
 * @param state 지금 보고 있는 좋아요 상태(원본에서 읽은 값)
 * @param onChange 새 상태를 원본(캐시나 state)에 반영하는 콜백
 * @param beforeChange 낙관적 값을 적기 직전에 기다릴 일. 원본이 목록 캐시인 화면이 그 목록의
 *   진행 중 조회를 취소할 때 쓴다(`useLikeToggle`)
 */
export function useArticleLike({
  articleId,
  state,
  onChange,
  beforeChange,
}: {
  articleId: string;
  state: LikeState;
  onChange: (next: LikeState) => void;
  beforeChange?: () => Promise<unknown>;
}) {
  const queryClient = useQueryClient();

  return useLikeToggle({
    toggle: (liked) =>
      liked ? likeArticle(articleId) : unlikeArticle(articleId),
    state,
    onChange,
    beforeChange,
    /* 되돌린 값은 누를 때 화면이 보여 주던 값이라, 내 상태 조회가 끝나기 전에 눌렀다면 서버와
       다를 수 있다. 서버에 다시 묻는다 (KAN-748) */
    onRollback: () => refreshMyArticleState(queryClient, articleId, ["liked"]),
  });
}

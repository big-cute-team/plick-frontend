"use client";

import type { LikeState } from "@plick/domain/types";
import { useLikeToggle } from "@/_hooks/useLikeToggle";
import { likeArticle, unlikeArticle } from "@/_services/article-likes";

/**
 * 기사·릴 좋아요 토글 (KAN-308). 릴스 액션 레일과 기사 세부 버튼이 함께 쓴다.
 *
 * 두 화면은 생김새가 완전히 다르지만(세로 아이콘 vs 알약 버튼) 눌렀을 때 할 일은
 * 같다. 그래서 버튼을 공용화하지 않고 이 훅만 공유한다(ADR 0011 게이트 B).
 *
 * 낙관적 갱신·롤백·로그인 유도는 {@link useLikeToggle}이 들고 있다 — 댓글
 * 좋아요(KAN-309)가 같은 규약을 쓰게 되면서 뼈대를 떼어냈다. 여기 남은 건
 * 기사 엔드포인트를 물리는 일뿐이다.
 *
 * @param articleId 기사(릴) id — 릴스와 기사가 같은 `articleSummaryId` 체계다
 * @param state 지금 보고 있는 좋아요 상태(원본에서 읽은 값)
 * @param onChange 새 상태를 원본(캐시나 state)에 반영하는 콜백
 */
export function useArticleLike({
  articleId,
  state,
  onChange,
}: {
  articleId: string;
  state: LikeState;
  onChange: (next: LikeState) => void;
}) {
  return useLikeToggle({
    toggle: (liked) =>
      liked ? likeArticle(articleId) : unlikeArticle(articleId),
    state,
    onChange,
  });
}

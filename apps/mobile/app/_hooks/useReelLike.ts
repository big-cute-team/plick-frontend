"use client";

import { useQueryClient } from "@tanstack/react-query";
import { syncLikeIntoFeeds } from "@plick/core/like-sync";
import { useArticleLike } from "@/_hooks/useArticleLike";
import type { ReelCard } from "@plick/domain/types";

/**
 * 릴 좋아요 토글 (KAN-308) — {@link useArticleLike}에 릴스판 원본 갱신을 물린다.
 *
 * 릴 카드의 원본은 무한 쿼리 캐시다. 컴포넌트 state로 들면 넘겼다 돌아왔을 때
 * 캐시의 옛 값으로 되돌아가므로, 낙관적 갱신도 롤백도 캐시를 직접 고친다.
 * 다음 리페치가 오면 서버 값이 그대로 덮는다 — 그게 맞는 값이다.
 *
 * 릴스 피드만 손으로 고치던 것을 `syncLikeIntoFeeds`로 바꿨다 (KAN-495). 같은
 * 기사가 홈·기사 피드와 마이페이지 "좋아요한 기사" 목록에도 카드로 들어 있어서,
 * 릴에서 누른 하트가 그쪽에도 같이 반영돼야 한다. 기사 세부의 버튼과 같은 길이다.
 */
export function useReelLike(reel: ReelCard) {
  const queryClient = useQueryClient();

  return useArticleLike({
    articleId: reel.id,
    state: { liked: reel.liked, likeCount: reel.likeCount },
    onChange: (next) => syncLikeIntoFeeds(queryClient, reel.id, next),
  });
}

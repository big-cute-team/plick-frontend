"use client";

import type { InfiniteData } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useArticleLike } from "@/_hooks/useArticleLike";
import { reelKeys } from "@/_queries/reelKeys";
import type { ReelCard, ReelFeedPage } from "@/_types/reels";

/**
 * 릴 좋아요 토글 (KAN-308) — {@link useArticleLike}에 릴스판 원본 갱신을 물린다.
 *
 * 릴 카드의 원본은 무한 쿼리 캐시다. 컴포넌트 state로 들면 넘겼다 돌아왔을 때
 * 캐시의 옛 값으로 되돌아가므로, 낙관적 갱신도 롤백도 캐시를 직접 고친다.
 * 다음 리페치가 오면 서버 값이 그대로 덮는다 — 그게 맞는 값이다.
 *
 * 페이지 전체를 훑어 같은 id를 고친다. 지금 계약상 한 릴이 두 페이지에 겹쳐 올
 * 일은 없지만, 어느 페이지에 있는지 따로 들고 다니지 않으려는 것이다.
 */
export function useReelLike(reel: ReelCard) {
  const queryClient = useQueryClient();

  return useArticleLike({
    articleId: reel.id,
    state: { liked: reel.liked, likeCount: reel.likeCount },
    onChange: (next) => {
      queryClient.setQueryData<InfiniteData<ReelFeedPage, string | null>>(
        reelKeys.feed(),
        (data) =>
          data && {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              items: page.items.map((item) =>
                item.id === reel.id ? { ...item, ...next } : item,
              ),
            })),
          },
      );
    },
  });
}

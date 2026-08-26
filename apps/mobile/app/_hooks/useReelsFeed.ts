"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { ApiError } from "@plick/core/client";
import { FEED_FRESH_MS, FEED_MAX_RETRIES } from "@/_constants/feed";
import { reelKeys } from "@plick/core/reelKeys";
import { getReels, getReelsFrom } from "@plick/core/reels";
import type { InitialReelFeed } from "@plick/domain/types";

/**
 * 릴스 피드 (KAN-276).
 *
 * 페이지네이션은 커서 기반이다. 다음 페이지 존재 여부를 알려주는 `hasNext`나 총 건수가
 * 없어서 `nextCursor`가 null인지로만 판단한다. `getNextPageParam`이 undefined를 돌려주면
 * RQ가 마지막 페이지로 보고 `hasNextPage`를 내린다 — null을 그대로 돌려주면 RQ는
 * "커서가 null인 페이지가 더 있다"로 읽어 첫 페이지를 무한히 다시 받는다.
 *
 * @param initial 서버 컴포넌트가 미리 받아 둔 첫 페이지와 그 시각.
 *   같은 데이터를 클라가 또 부르는 이중 페치를 막는 씨앗이다.
 * @param anchorId 딥링크(`/reels/[postId]`) 진입 릴 id (KAN-349). 있으면 첫 페이지를
 *   `GET /reels/{id}`로 받아 그 릴부터 시작하고, 이후 페이지는 응답 커서로 기존
 *   피드를 이어 간다. 캐시 키도 앵커별로 분리된다 — 탭 피드와 섞이지 않는다.
 */
export function useReelsFeed(initial?: InitialReelFeed, anchorId?: string) {
  return useInfiniteQuery({
    queryKey: anchorId ? reelKeys.anchor(anchorId) : reelKeys.feed(),
    /* 커서가 없는 요청이 곧 첫 페이지다 — 앵커 모드는 그 첫 페이지만 딥링크로 받는다 */
    queryFn: ({ pageParam }) =>
      pageParam === null && anchorId
        ? getReelsFrom(anchorId)
        : getReels({ cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialData: initial
      ? { pages: [initial.page], pageParams: [null] }
      : undefined,
    /**
     * 씨앗의 신선도를 서버가 받은 시각으로 못박는다. 안 넘기면 RQ가 캐시 엔트리를
     * 만드는 순간으로 찍어서, 화면에 오래 머문 뒤 이 씨앗이 다시 쓰일 때 묵은
     * 데이터가 방금 받은 것으로 취급된다. 제 나이를 달아 두면 그런 씨앗은 심자마자
     * stale로 판정돼 갱신이 걸린다.
     *
     * 기기 시계가 서버보다 뒤처져 있으면 서버 시각이 미래로 보여 영영 신선한 것이
     * 되므로, 지금보다 미래인 값은 지금으로 깎는다.
     */
    initialDataUpdatedAt: initial
      ? () => Math.min(initial.fetchedAt, Date.now())
      : undefined,
    staleTime: FEED_FRESH_MS,
    gcTime: FEED_FRESH_MS,
    /**
     * 포커스가 돌아올 때마다 쌓인 페이지를 전부 다시 체이닝하는 걸 막는다.
     * 릴스는 보던 자리를 유지하는 게 더 중요하고, 새 릴은 다시 들어올 때
     * (`refetchOnMount`) 받으면 충분하다.
     */
    refetchOnWindowFocus: false,
    /**
     * 4xx는 다시 보내도 같은 답이 온다. 잘못된 파라미터나 커서가 그렇고,
     * 특히 커서가 상하면 재시도가 전부 400으로 낭비된다.
     * 서버 오류나 네트워크 순단만 다시 시도한다.
     */
    retry: (failureCount, error) => {
      if (
        error instanceof ApiError &&
        error.status >= 400 &&
        error.status < 500
      ) {
        return false;
      }
      return failureCount < FEED_MAX_RETRIES;
    },
  });
}

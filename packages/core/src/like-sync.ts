/**
 * @file 좋아요 상태를 캐시된 피드 목록에 옮겨 붙인다 (KAN-379).
 *
 * 기사 세부의 좋아요 버튼은 서버가 준 props를 원본으로 삼아 컴포넌트 state로
 * 든다(캐시가 없는 화면이라 그게 맞다). 그런데 그 기사는 홈·기사·릴스 피드
 * 캐시에도 카드로 들어 있어서, 세부에서 하트를 누르고 목록으로 돌아오면 목록은
 * 누르기 전 숫자를 그대로 보여준다. 다음 갱신 전까지 두 화면이 서로 다른 값을
 * 말하는 셈이다.
 *
 * 그래서 세부에서 확정된 값을 캐시에 든 같은 id의 카드에도 함께 적는다.
 * 서버를 다시 부르지 않고 이미 받아 둔 목록만 고치므로 비용이 없다.
 */

import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { LikeState } from "@plick/domain/types";
import { articleKeys } from "./articleKeys";
import { reelKeys } from "./reelKeys";

/** 피드 페이지의 최소 모양 — 기사·릴 카드가 공통으로 가진 부분만 본다. */
interface FeedPageLike {
  items: { id: string }[];
}

/**
 * 캐시된 모든 기사·릴스 피드에서 해당 id의 카드에 좋아요 상태를 반영한다.
 *
 * 팀 탭마다 캐시 엔트리가 따로 있어(`articleKeys.feed(team)`) 어느 탭에 들어
 * 있는지 모르므로 도메인 상위 키로 한 번에 훑는다. 아직 안 받은 탭은 캐시가
 * 없어 그냥 지나간다.
 *
 * @param queryClient 앱의 QueryClient
 * @param articleId 기사(릴) id — 릴스와 기사가 같은 `articleSummaryId` 체계다
 * @param next 확정된 좋아요 상태
 */
export function syncLikeIntoFeeds(
  queryClient: QueryClient,
  articleId: string,
  next: LikeState,
): void {
  const patch = (data: InfiniteData<FeedPageLike> | undefined) =>
    data && {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        items: page.items.map((item) =>
          item.id === articleId ? { ...item, ...next } : item,
        ),
      })),
    };

  for (const key of [articleKeys.all, reelKeys.all]) {
    queryClient.setQueriesData<InfiniteData<FeedPageLike>>(
      { queryKey: key },
      patch,
    );
  }
}

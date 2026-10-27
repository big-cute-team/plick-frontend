/**
 * @file 투표 집계를 캐시된 다른 화면에 옮겨 붙인다 (KAN-418).
 *
 * 같은 토론이 세 군데에 산다 — 토론 리스트 캐시(`debateKeys.list`), 릴스 피드
 * 캐시의 카드 안 `debate`, 기사 상세의 토론 캐시(`debateKeys.byArticle`, KAN-681).
 * 셋 다 쿼리 캐시라 여기서 함께 고친다. 좋아요의 `like-sync.ts`와 같은 이유·같은
 * 방식이다 — 서버를 다시 부르지 않고 이미 받아 둔 데이터만 고친다.
 *
 * 기사 상세는 KAN-681 전까지 서버 props를 컴포넌트 state로 복사해 들고 있어서
 * 여기서 손댈 수 없었고, 그래서 투표 탭에서 누른 표가 기사에 안 보였다. 지금은
 * 기사 상세도 쿼리 캐시가 원본이라 같은 길로 맞춘다.
 */

import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type {
  Debate,
  DebateListItem,
  DebateVoteState,
  ReelFeedPage,
} from "@plick/domain/types";
import { debateKeys } from "./debateKeys";
import { reelKeys } from "./reelKeys";

/**
 * 캐시된 토론 리스트·릴스 피드·기사별 토론에서 해당 토론의 집계를 갱신한다.
 *
 * 릴스는 피드·앵커 등 엔트리가 여럿이라 도메인 상위 키로 한 번에 훑는다. 기사별
 * 토론도 기사마다 키가 달라 상위 키(`debateKeys.articles`)로 훑고 토론 id로 고른다.
 * 아직 안 받은 캐시는 없어서 그냥 지나간다.
 *
 * @param queryClient 앱의 QueryClient
 * @param debateId 토론 id
 * @param next 확정(또는 낙관) 집계 상태
 */
export function syncDebateVote(
  queryClient: QueryClient,
  debateId: string,
  next: DebateVoteState,
): void {
  queryClient.setQueriesData<DebateListItem[]>(
    { queryKey: debateKeys.list() },
    (items) =>
      items?.map((item) =>
        item.id === debateId ? { ...item, ...next } : item,
      ),
  );

  queryClient.setQueriesData<InfiniteData<ReelFeedPage>>(
    { queryKey: reelKeys.all },
    (data) =>
      data && {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          items: page.items.map((item) =>
            item.debate?.id === debateId
              ? { ...item, debate: { ...item.debate, ...next } }
              : item,
          ),
        })),
      },
  );

  queryClient.setQueriesData<Debate | null>(
    { queryKey: debateKeys.articles },
    (debate) =>
      debate && debate.id === debateId ? { ...debate, ...next } : debate,
  );
}

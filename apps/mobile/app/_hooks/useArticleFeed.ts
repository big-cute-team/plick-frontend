"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import type { Filter } from "@plick/domain/types";
import { ApiError } from "@/_apis/client";
import { articleKeys } from "@/_queries/articleKeys";
import { getArticles } from "@/_services/articles";
import type { InitialArticleFeed } from "@/_types/articles";

/** 네트워크 순단만 다시 시도한다 (아래 retry 참고). */
const MAX_RETRIES = 2;

/**
 * 이 피드를 신선한 것으로 보는 시간(ms). `staleTime`과 `gcTime`에 같은 값을 쓴다.
 *
 * 둘을 붙여 두는 게 핵심이다. 무한 쿼리의 재요청은 쌓인 페이지를 전부 순차로 다시
 * 받는데(커서 체인이라 앞 페이지 응답이 와야 다음 커서를 알아 병렬도 안 된다),
 * `gcTime`이 `staleTime`보다 길면 그 사이 구간에서 정확히 그 일이 벌어진다.
 * 30페이지까지 스크롤하고 홈을 떠났다 그 구간에 돌아오면 요청이 30개 나간다.
 *
 * 같은 값으로 붙이면 그 구간이 사라진다. 신선하면 캐시를 그대로 쓰고(요청 0),
 * 신선하지 않으면 엔트리가 이미 정리돼 서버 컴포넌트가 방금 받아 온 첫 페이지가
 * 씨앗으로 들어간다(역시 요청 0). 홈에 올 때마다 서버는 어차피 첫 페이지를 받고
 * 있었으므로, 버려지던 그 결과가 여기서 쓰인다.
 *
 * 새 글이 몇 분에 한두 개 올라오는 인입 주기라 1분이면 사실상 매번 최신을 본다.
 * 둘 중 하나만 바꾸면 위 구간이 조용히 되살아나므로 반드시 같이 움직인다.
 */
const FEED_FRESH_MS = 60_000;

/**
 * 팀 필터별 기사 피드 (KAN-271).
 *
 * 탭을 바꾸면 쿼리키가 바뀌어 BE에 `teamId`를 붙인 요청이 새로 나가고, 한 번 받은
 * 탭은 신선한 동안 캐시에 남아 되돌아올 때 다시 부르지 않는다. 한 페이지 안에서
 * 걸러내던 기존 클라 필터와 달리 팀별 전체 목록에서 최신순으로 온다.
 *
 * 페이지네이션은 커서 기반이다. 다음 페이지 존재 여부를 알려주는 `hasNext`나
 * 총 건수가 없어서 `nextCursor`가 null인지로만 판단한다. `getNextPageParam`이
 * undefined를 돌려주면 RQ가 마지막 페이지로 보고 `hasNextPage`를 내린다.
 *
 * @param team 현재 선택된 팀 필터
 * @param initial 서버 컴포넌트가 미리 받아 둔 전체(ALL) 첫 페이지와 그 시각.
 *   같은 데이터를 클라가 또 부르는 이중 페치를 막는 씨앗이라 ALL일 때만 심는다.
 */
export function useArticleFeed(team: Filter, initial?: InitialArticleFeed) {
  const seed = team === "ALL" ? initial : undefined;

  return useInfiniteQuery({
    queryKey: articleKeys.feed(team),
    queryFn: ({ pageParam }) => getArticles({ team, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialData: seed ? { pages: [seed.page], pageParams: [null] } : undefined,
    /**
     * 씨앗의 신선도를 서버가 받은 시각으로 못박는다. 안 넘기면 RQ가 캐시 엔트리를
     * 만드는 순간으로 찍어서, 화면에 오래 머문 뒤 이 씨앗이 다시 쓰일 때(팀 탭을
     * 오가다 ALL 엔트리가 정리된 경우) 묵은 데이터가 방금 받은 것으로 취급된다.
     * 제 나이를 달아 두면 그런 씨앗은 심자마자 stale로 판정돼 갱신이 걸린다.
     *
     * 기기 시계가 서버보다 뒤처져 있으면 서버 시각이 미래로 보여 영영 신선한 것이
     * 되므로, 지금보다 미래인 값은 지금으로 깎는다. 반대 방향(기기가 앞선 경우)은
     * 실제보다 낡게 보여 갱신이 한 번 더 걸릴 뿐이라 안전한 쪽으로 틀어진다.
     */
    initialDataUpdatedAt: seed
      ? () => Math.min(seed.fetchedAt, Date.now())
      : undefined,
    staleTime: FEED_FRESH_MS,
    gcTime: FEED_FRESH_MS,
    /**
     * 포커스가 돌아올 때마다 위 재체이닝이 도는 걸 막는다. 새 글이 몇 분에 한두
     * 개라 창을 다시 볼 때마다 맞출 만큼 자주 바뀌지 않고, 홈에 다시 들어오는
     * 시점(`refetchOnMount`)이면 충분하다.
     */
    refetchOnWindowFocus: false,
    /**
     * 4xx는 다시 보내도 같은 답이 온다. 잘못된 파라미터나 커서가 그렇고,
     * 특히 커서가 상하면 재시도 세 번이 전부 400으로 낭비된다.
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
      return failureCount < MAX_RETRIES;
    },
  });
}

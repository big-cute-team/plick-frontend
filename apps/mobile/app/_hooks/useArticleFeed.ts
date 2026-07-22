"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import type { Filter } from "@plick/domain/types";
import { ApiError } from "@/_apis/client";
import { articleKeys } from "@/_queries/articleKeys";
import { getArticles } from "@/_services/articles";
import type { ArticleFeedPage } from "@/_types/articles";

/** 네트워크 순단만 다시 시도한다 (아래 retry 참고). */
const MAX_RETRIES = 2;

/**
 * 팀 필터별 기사 피드 (KAN-271).
 *
 * 탭을 바꾸면 쿼리키가 바뀌어 BE에 `teamId`를 붙인 요청이 새로 나가고, 한 번 받은
 * 탭은 캐시에 남아 되돌아올 때 다시 부르지 않는다. 한 페이지 안에서 걸러내던
 * 기존 클라 필터와 달리 팀별 전체 목록에서 최신순으로 온다.
 *
 * 페이지네이션은 커서 기반이다. 다음 페이지 존재 여부를 알려주는 `hasNext`나
 * 총 건수가 없어서 `nextCursor`가 null인지로만 판단한다. `getNextPageParam`이
 * undefined를 돌려주면 RQ가 마지막 페이지로 보고 `hasNextPage`를 내린다.
 *
 * @param team 현재 선택된 팀 필터
 * @param initial 서버 컴포넌트가 미리 받아 둔 전체(ALL) 첫 페이지.
 *   같은 데이터를 클라가 또 부르는 이중 페치를 막는 씨앗이라 ALL일 때만 심는다.
 */
export function useArticleFeed(team: Filter, initial?: ArticleFeedPage) {
  return useInfiniteQuery({
    queryKey: articleKeys.feed(team),
    queryFn: ({ pageParam }) => getArticles({ team, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialData:
      team === "ALL" && initial
        ? { pages: [initial], pageParams: [null] }
        : undefined,
    /**
     * 무한 쿼리의 재요청은 쌓인 페이지를 전부 순차로 다시 받는다. 커서 체인이라
     * 앞 페이지 응답이 와야 다음 커서를 알 수 있어 병렬도 안 된다. 깊게 스크롤한
     * 상태에서 탭을 돌아올 때마다 요청이 페이지 수만큼 나가므로 포커스 재요청은 끈다.
     * 피드는 창을 다시 볼 때마다 최신으로 맞춰야 할 성격도 아니다.
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

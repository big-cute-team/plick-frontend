"use client";

import { useQuery } from "@tanstack/react-query";
import type { Filter } from "@plick/domain/types";
import { articleKeys } from "@/_queries/articleKeys";
import { getArticles } from "@/_services/articles";
import type { ArticleFeedPage } from "@/_types/articles";

/**
 * 팀 필터별 기사 피드 (KAN-271).
 *
 * 탭을 바꾸면 쿼리키가 바뀌어 BE에 `teamId`를 붙인 요청이 새로 나가고, 한 번 받은
 * 탭은 캐시에 남아 되돌아올 때 다시 부르지 않는다. 한 페이지 안에서 걸러내던
 * 기존 클라 필터와 달리 팀별 전체 목록에서 최신순으로 온다.
 *
 * @param team 현재 선택된 팀 필터
 * @param initial 서버 컴포넌트가 미리 받아 둔 전체(ALL) 첫 페이지.
 *   같은 데이터를 클라가 또 부르는 이중 페치를 막는 씨앗이라 ALL일 때만 심는다.
 */
export function useArticleFeed(team: Filter, initial?: ArticleFeedPage) {
  return useQuery({
    queryKey: articleKeys.feed(team),
    queryFn: () => getArticles({ team }),
    initialData: team === "ALL" ? initial : undefined,
  });
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@plick/core/client";
import { articleKeys } from "@plick/core/articleKeys";
import { getMatchNews } from "@plick/core/articles";
import type { TeamCode } from "@plick/domain/types";
import { FEED_FRESH_MS, FEED_MAX_RETRIES } from "@/_constants/feed";

/**
 * 경기 상세 뉴스 탭 목록 (KAN-484) — 그 경기 양 팀의 최신 기사를 합쳐 받는다.
 *
 * 무한 목록이 아니라 한 페이지 고정이다. 이 탭은 "이 경기 팀 소식이 뭐가 있나"를
 * 훑는 자리고, 끝까지 내려보는 건 기사 목록의 팀 탭이 맡는다(모바일 훅과 같은 정책이다).
 *
 * 탭을 처음 열 때만 받는다 — `enabled`로 막아 두면 요약·라인업만 보고 나가는
 * 사람에게 기사 요청이 나가지 않는다. 한 번 받으면 탭을 오가도 신선한 동안
 * 캐시를 그대로 쓴다.
 *
 * @param teams 경기의 빅6 팀 코드 (0~2개). 비면 아예 부르지 않는다
 * @param enabled 뉴스 탭이 지금 보이는가
 */
export function useMatchNews(teams: TeamCode[], enabled: boolean) {
  return useQuery({
    queryKey: articleKeys.matchNews(teams),
    queryFn: () => getMatchNews(teams),
    enabled: enabled && teams.length > 0,
    staleTime: FEED_FRESH_MS,
    gcTime: FEED_FRESH_MS,
    refetchOnWindowFocus: false,
    // 탭 자리에 상태 분기로 에러를 그리므로 경계로 던지지 않는다
    throwOnError: false,
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

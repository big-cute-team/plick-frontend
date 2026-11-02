"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { InitialDebateList, TrendRanking } from "@plick/domain/types";
import { todayDateKeyKst, type MatchSummary } from "@plick/domain/live";
import { getHomeTrends } from "./home-trends";
import { getMatches } from "./live";
import { liveKeys } from "./liveKeys";
import { getDebates } from "./debates";
import { debateKeys } from "./debateKeys";
import { retryUnlessClientError } from "./query-policy";
import { useFreshSeed } from "./useFreshSeed";

export const homeKeys = { trends: ["home", "trends"] as const };

/** 실검은 화면을 보고 있을 때 1분마다 새 집계를 확인한다. */
export function useHomeTrends(
  initial: TrendRanking | undefined,
  visible: boolean,
) {
  return useQuery({
    queryKey: homeKeys.trends,
    queryFn: getHomeTrends,
    initialData: initial,
    staleTime: 60_000,
    refetchInterval: visible ? 60_000 : false,
    retry: retryUnlessClientError(),
    throwOnError: false,
  });
}

/** 오늘 경기 한 줄. 날짜가 바뀌면 새 날짜의 캐시로 넘어간다. */
export function useHomeMatches(
  initial: { date: string; items: MatchSummary[] } | undefined,
  visible: boolean,
) {
  const [date, setDate] = useState(initial?.date ?? todayDateKeyKst());
  useEffect(() => {
    if (!visible) return;
    const update = () => setDate(todayDateKeyKst());
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [visible]);
  return useQuery({
    queryKey: liveKeys.matches(date),
    queryFn: () => getMatches(date),
    initialData: date === initial?.date ? initial.items : undefined,
    staleTime: 20_000,
    refetchInterval: visible ? 20_000 : false,
    retry: retryUnlessClientError(),
    throwOnError: false,
  });
}

/** 홈 투표 카드의 집계와 대표 의견을 화면에 보일 때만 주기적으로 받는다. */
export function useHomeDebates(
  initial: InitialDebateList | undefined,
  visible: boolean,
) {
  useFreshSeed(
    debateKeys.list(),
    initial && { data: initial.items, fetchedAt: initial.fetchedAt },
  );
  return useQuery({
    queryKey: debateKeys.list(),
    queryFn: () => getDebates(),
    initialData: initial?.items,
    initialDataUpdatedAt: initial?.fetchedAt,
    staleTime: 0,
    refetchInterval: visible ? 30_000 : false,
    retry: retryUnlessClientError(),
    throwOnError: false,
  });
}

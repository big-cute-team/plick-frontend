"use client";

import type { InitialMatchList } from "@plick/domain/live";
import { useMatches } from "@/_hooks/useMatches";
import { LiveEmptyDay } from "./LiveEmptyDay";
import { LiveLoadError } from "./LiveLoadError";
import { MatchDayList } from "./MatchDayList";
import { MatchListSkeleton } from "./MatchListSkeleton";

/**
 * LIVE 좌측의 경기 목록 본체 (KAN-452). 모바일 `LiveMatchesFeed`의 웹 이식. 씨앗
 * 없이 들어와 클라가 받는 동안은 스켈레톤, 실패는 에러 지면, 빈 배열은 빈 날 지면이다.
 *
 * @param date 보고 있는 날짜 키
 * @param initial 서버가 받아 둔 목록 씨앗. 없으면 클라가 직접 받는다
 */
export function LiveMatchesFeed({
  date,
  initial,
}: {
  date: string;
  initial?: InitialMatchList;
}) {
  const { data, isPending, isError, refetch } = useMatches(date, initial);

  if (isPending) {
    return <MatchListSkeleton />;
  }
  if (isError) return <LiveLoadError onRetry={() => refetch()} />;
  if (data.length === 0) return <LiveEmptyDay />;
  return <MatchDayList matches={data} />;
}

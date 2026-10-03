"use client";

import type { InitialMatchList } from "@plick/domain/live";
import { useMatches } from "@/_hooks/useMatches";
import { LiveEmptyDay } from "./LiveEmptyDay";
import { LiveLoadError } from "./LiveLoadError";
import { MatchDayList } from "./MatchDayList";

/** 첫 로딩에 보여줄 행 자리 개수. */
const SKELETON_COUNT = 3;

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
    return (
      <div>
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <MatchRowSkeleton key={i} />
        ))}
      </div>
    );
  }
  if (isError) return <LiveLoadError onRetry={() => refetch()} />;
  if (data.length === 0) return <LiveEmptyDay />;
  return <MatchDayList matches={data} />;
}

/** 경기 행 자리 스켈레톤 — 상태 칸, 팀 두 줄, 스코어의 실루엣이다 (KAN-567 행 높이). */
function MatchRowSkeleton() {
  return (
    <div className="border-border-soft flex animate-pulse items-center gap-5 border-b px-2 py-3.25">
      <div className="bg-chip h-9 w-15.5" />
      <div className="bg-border h-10 w-px" />
      <div className="flex flex-1 flex-col gap-2.25">
        <div className="bg-chip h-6 w-1/2" />
        <div className="bg-chip h-6 w-2/5" />
      </div>
      <div className="bg-chip h-10 w-4" />
    </div>
  );
}

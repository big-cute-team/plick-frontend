"use client";

import type { InitialMatchList } from "@plick/domain/live";
import { useMatches } from "@/_hooks/useMatches";
import { LiveEmptyDay } from "./LiveEmptyDay";
import { LiveLoadError } from "./LiveLoadError";
import { MatchDayList } from "./MatchDayList";

/** 첫 로딩에 보여줄 카드 자리 개수. */
const SKELETON_COUNT = 3;

/**
 * 대시보드 좌측의 경기 목록 본체 (KAN-452) — 모바일 `LiveMatchesFeed`의 웹
 * 이식. 씨앗 없이 들어와 클라가 받는 동안은 스켈레톤, 실패는 에러 지면(LW3),
 * 빈 배열은 빈 날 지면(LW2)이다.
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
      <div className="flex flex-col gap-2 pt-2">
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <MatchCardSkeleton key={i} />
        ))}
      </div>
    );
  }
  if (isError) return <LiveLoadError onRetry={() => refetch()} />;
  if (data.length === 0) return <LiveEmptyDay />;
  return <MatchDayList matches={data} />;
}

/** 경기 카드 자리 스켈레톤 — 상태 컬럼·팀 두 줄·스코어의 실루엣이다. */
function MatchCardSkeleton() {
  return (
    <div className="bg-elevate rounded-card flex animate-pulse items-center gap-5 px-5 py-4.5">
      <div className="bg-elevate-2 rounded-control h-11 w-16" />
      <div className="flex flex-1 flex-col gap-2.5">
        <div className="bg-elevate-2 rounded-control h-5 w-2/3" />
        <div className="bg-elevate-2 rounded-control h-5 w-1/2" />
      </div>
      <div className="bg-elevate-2 rounded-control h-11 w-6" />
    </div>
  );
}

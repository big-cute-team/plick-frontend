"use client";

import type { InitialMatchList } from "@plick/domain/live";
import { QueryBoundary } from "@/_components/QueryBoundary";
import { useMatches } from "@/_hooks/useMatches";
import { LiveEmptyDay } from "./LiveEmptyDay";
import { LiveLoadError } from "./LiveLoadError";
import { MatchDayList } from "./MatchDayList";

/** 첫 로딩에 보여줄 행 자리 개수. */
const SKELETON_COUNT = 3;

/**
 * 경기 목록 본체 (KAN-452). 경계만 세우고 목록은 {@link MatchesList}가
 * 그린다(KAN-447 규약). 씨앗 없이 들어와 클라가 받는 동안은 스켈레톤이,
 * 실패는 경계의 에러 지면(L4)이 받는다. 날짜 줄은 경계 밖이라
 * 실패해도 다른 날짜로 이동할 수 있다.
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
  return (
    <QueryBoundary
      name="LiveMatches"
      fallback={
        <div className="px-edge flex flex-col">
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <MatchRowSkeleton key={i} />
          ))}
        </div>
      }
      errorFallback={(retry) => <LiveLoadError onRetry={retry} />}
    >
      <MatchesList date={date} initial={initial} />
    </QueryBoundary>
  );
}

/** 목록 본체. suspense 쿼리를 부르는 쪽이라 경계 안에 산다. 성공 케이스만 그린다. */
function MatchesList({
  date,
  initial,
}: {
  date: string;
  initial?: InitialMatchList;
}) {
  const { data: matches } = useMatches(date, initial);

  if (matches.length === 0) return <LiveEmptyDay />;
  return <MatchDayList matches={matches} />;
}

/** 경기 행 자리 스켈레톤 (KAN-567). 상태 칸, 팀명과 엠블럼 둘, 스코어의 실루엣이다. */
function MatchRowSkeleton() {
  return (
    <div className="border-border-soft flex animate-pulse items-center gap-2.5 border-b py-3.25">
      <div className="bg-elevate rounded-badge h-7 w-10.5" />
      <div className="flex flex-1 items-center justify-end gap-2">
        <div className="bg-elevate rounded-badge h-3.5 w-14" />
        <div className="bg-avatar size-9 rounded-full" />
      </div>
      <div className="bg-elevate rounded-badge h-5 w-10" />
      <div className="flex flex-1 items-center gap-2">
        <div className="bg-avatar size-9 rounded-full" />
        <div className="bg-elevate rounded-badge h-3.5 w-14" />
      </div>
    </div>
  );
}

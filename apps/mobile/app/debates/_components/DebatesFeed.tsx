"use client";

import { closedLast, isBalanceClosed } from "@plick/domain/vs";
import type { InitialDebateList } from "@plick/domain/types";
import { useDebateClock } from "@plick/core/use-debate-clock";
import { QueryBoundary } from "@/_components/QueryBoundary";
import { useDebateTab } from "@/_hooks/useDebateTab";
import { useDebates } from "@/_hooks/useDebates";
import { useHydrated } from "@/_hooks/useHydrated";
import { useViewState } from "@/_stores/view-state";
import type { DebateTab } from "@/_types/debates";
import { DebateListSkeleton } from "./DebateListSkeleton";
import { DebateTabs } from "./DebateTabs";
import { PredictionRanking } from "./PredictionRanking";
import { PredictionFeed } from "./PredictionFeed";
import { BalanceGameItem } from "./BalanceGameItem";

/** VS: 밸런스게임·승부예측·랭킹. 기존 URL과 익명 ISR을 유지한다. */
export function DebatesFeed({ initial }: { initial?: InitialDebateList }) {
  const [tab, selectTab] = useDebateTab();
  const hydrated = useHydrated();
  function handleChange(next: DebateTab) {
    if (next === tab) return;
    useViewState.getState().requestTop("debate");
    selectTab(next);
  }
  return (
    <>
      <DebateTabs value={tab} onChange={handleChange} />
      {tab === "rank" ? (
        <PredictionRanking />
      ) : tab === "prediction" ? (
        <PredictionFeed />
      ) : (
        <section className="px-edge">
          <QueryBoundary
            name="DebatesFeed"
            fallback={<DebateListSkeleton />}
            errorMessage="밸런스게임을 불러오지 못했어요"
          >
            {initial || hydrated ? (
              <DebateList initial={initial} />
            ) : (
              <DebateListSkeleton />
            )}
          </QueryBoundary>
        </section>
      )}
    </>
  );
}
function DebateList({ initial }: { initial?: InitialDebateList }) {
  const { data, refetch } = useDebates(initial);
  const now = useDebateClock(data, refetch);
  const items = closedLast(data, (debate) => isBalanceClosed(debate, now));
  if (!items.length)
    return (
      <p className="text-body text-text-4 py-12 text-center">
        아직 밸런스게임이 없어요
      </p>
    );
  return (
    <>
      <h2 className="sr-only">밸런스게임</h2>
      <ul className="flex flex-col gap-3 py-4">
        {items.map((debate) => (
          <li key={debate.id}>
            <BalanceGameItem
              debate={debate}
              closed={isBalanceClosed(debate, now)}
            />
          </li>
        ))}
      </ul>
    </>
  );
}

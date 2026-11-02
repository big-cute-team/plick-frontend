"use client";

import { closedLast, isBalanceClosed } from "@plick/domain/vs";
import type { InitialDebateList } from "@plick/domain/types";
import { useDebateClock } from "@plick/core/use-debate-clock";
import { useDebateTab } from "@/_hooks/useDebateTab";
import { useDebates } from "@/_hooks/useDebates";
import { DebateListSkeleton } from "./DebateListSkeleton";
import { DebateTabBar } from "./DebateTabs";
import { PredictionRanking } from "./PredictionRanking";
import { PredictionFeed } from "./PredictionFeed";
import { BalanceGameItem } from "./BalanceGameItem";

/** VS 목록. 탭 안에서만 조회해 선택하지 않은 목록의 요청은 만들지 않는다. */
export function DebatesFeed({ initial }: { initial?: InitialDebateList }) {
  const [tab, selectTab] = useDebateTab();
  return (
    <>
      <DebateTabBar tab={tab} onSelect={selectTab} />
      {tab === "rank" ? (
        <PredictionRanking />
      ) : tab === "prediction" ? (
        <PredictionFeed />
      ) : (
        <DebateList initial={initial} />
      )}
    </>
  );
}
function DebateList({ initial }: { initial?: InitialDebateList }) {
  const { data, isPending, isError, isFetching, refetch } = useDebates(initial);
  const now = useDebateClock(data ?? [], refetch);
  const items = closedLast(data ?? [], (debate) =>
    isBalanceClosed(debate, now),
  );
  if (isPending) return <DebateListSkeleton />;
  if (isError && !items.length)
    return (
      <div className="py-10">
        <p className="text-body text-text-3">밸런스게임을 불러오지 못했어요</p>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-accent min-h-11 font-bold"
        >
          다시 시도
        </button>
      </div>
    );
  if (!items.length)
    return (
      <p className="text-body text-text-4 py-10">아직 밸런스게임이 없어요</p>
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

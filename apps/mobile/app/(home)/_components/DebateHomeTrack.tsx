"use client";
import Link from "next/link";
import { useRef } from "react";
import { useHomeDebates } from "@plick/core/home-queries";
import { useOnScreen } from "@plick/core/useOnScreen";
import { useDebateClock } from "@plick/core/use-debate-clock";
import type { InitialDebateList } from "@plick/domain/types";
import { closedLast, isBalanceClosed } from "@plick/domain/vs";
import { BalanceGameItem } from "@/debates/_components/BalanceGameItem";
import { PredictionCardsSkeleton } from "./PredictionSectionSkeleton";

/**
 * 승부예측과 같은 가로 카드 트랙으로 홈 투표를 보여준다. 제목 줄은 승부예측과 같은 높이로 낮췄다
 * (KAN-709, 위 13, 제목 14, 아래 7). 아래 소식 섹션이 첫 화면에 더 가까워지게 하는 몫이다.
 */
export function DebateHomeTrack({
  initial,
}: {
  initial: InitialDebateList | undefined;
}) {
  const ref = useRef<HTMLElement>(null);
  const visible = useOnScreen(ref);
  const { data, isError, refetch } = useHomeDebates(initial, visible);
  const now = useDebateClock(data ?? [], refetch);
  const cards = closedLast(data ?? [], (item) => isBalanceClosed(item, now));
  return (
    <section ref={ref} aria-label="투표" className="px-edge pt-3">
      <div className="flex items-center justify-between gap-2 pb-1.5">
        <h2 className="text-body-md text-text-strong tracking-section font-black">
          투표
        </h2>
        <Link
          href="/debates"
          className="text-label text-accent focus-visible:outline-accent hover:text-accent-hover -my-3 flex min-h-11 items-center font-bold focus-visible:outline-2"
        >
          전체 보기
        </Link>
      </div>
      {!data ? (
        isError ? (
          <p className="text-body text-text-3 py-8 text-center">
            투표를 불러오지 못했어요
          </p>
        ) : (
          <PredictionCardsSkeleton />
        )
      ) : !cards.length ? (
        <p className="text-body text-text-3 py-8 text-center">
          아직 투표가 없어요
        </p>
      ) : (
        <ul className="no-scrollbar -mx-edge px-edge scroll-px-edge flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1">
          {cards.map((debate) => (
            <li key={debate.id} className="flex w-[84%] shrink-0 snap-start">
              <BalanceGameItem
                debate={debate}
                closed={isBalanceClosed(debate, now)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

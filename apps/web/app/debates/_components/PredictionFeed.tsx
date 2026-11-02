"use client";

import Link from "next/link";
import { usePredictionFeed } from "@plick/core/prediction-queries";
import { closedLast } from "@plick/domain/vs";
import { matchPredictionPath } from "@plick/domain/prediction";
import { PredictionHomeCard } from "@plick/ui/PredictionHomeCard";
import { DebateListSkeleton } from "./DebateListSkeleton";

/** 참여 가능 경기부터 보여주고 마감 경기는 아래에서 이어 본다. */
export function PredictionFeed() {
  const {
    data,
    isPending,
    isError,
    isFetching,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = usePredictionFeed();
  const cards = closedLast(
    data?.pages.flatMap((page) => page.items) ?? [],
    (card) =>
      card.status === "LOCKED" ||
      card.status === "SETTLED" ||
      card.status === "VOID",
  );
  return (
    <section aria-label="승부예측">
      {isPending ? (
        <DebateListSkeleton />
      ) : isError && !cards.length ? (
        <div className="py-10 text-center">
          <p className="text-body text-text-3">승부예측을 불러오지 못했어요</p>
          <button
            type="button"
            disabled={isFetching}
            onClick={() => refetch()}
            className="text-accent mt-3 min-h-11 font-bold"
          >
            다시 시도
          </button>
        </div>
      ) : cards.length === 0 ? (
        <p className="text-body text-text-3 py-10 text-center">
          지금 예측할 경기가 없어요
        </p>
      ) : (
        <>
          <h2 className="sr-only">승부예측</h2>
          <ul className="flex flex-col gap-3 py-4">
            {cards.map((card) => (
              <li key={card.matchId}>
                <Link
                  href={matchPredictionPath(card.matchId)}
                  className="focus-visible:outline-accent rounded-card flex transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 active:opacity-70"
                >
                  <PredictionHomeCard card={card} size="lg" />
                </Link>
              </li>
            ))}
          </ul>
          {(hasNextPage || isFetchNextPageError) && (
            <button
              type="button"
              disabled={isFetchingNextPage}
              onClick={() => fetchNextPage()}
              className="text-accent mb-4 min-h-11 w-full font-bold disabled:opacity-50"
            >
              {isFetchingNextPage
                ? "불러오는 중"
                : isFetchNextPageError
                  ? "더 불러오지 못했어요, 다시 시도"
                  : "경기 더 보기"}
            </button>
          )}
        </>
      )}
    </section>
  );
}

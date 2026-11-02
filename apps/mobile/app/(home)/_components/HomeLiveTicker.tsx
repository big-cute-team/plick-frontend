"use client";
import Link from "next/link";
import { useRef } from "react";
import { useHomeMatches } from "@plick/core/home-queries";
import { useOnScreen } from "@plick/core/useOnScreen";
import { matchStatusLabel, type MatchSummary } from "@plick/domain/live";
import { homeTickerMatches } from "@plick/domain/home";
import { predictionTeamLabel } from "@plick/domain/prediction";
import { LiveCrest } from "@plick/ui/LiveCrest";
import { RotatingLine } from "@plick/ui/RotatingLine";

/** 진행 중인 경기를 순환한다. 라이브가 없으면 오늘 경기 일정을 보여준다. */
export function HomeLiveTicker({
  initial,
}: {
  initial: { date: string; items: MatchSummary[] } | undefined;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useOnScreen(ref);
  const { data } = useHomeMatches(initial, visible);
  const matches = homeTickerMatches(data ?? []);
  const live = matches.some((match) => match.status === "LIVE");
  return (
    <div ref={ref} className="px-edge pt-3 empty:hidden">
      {matches.length > 0 && (
        <RotatingLine
          label={live ? "LIVE" : "오늘 경기"}
          live={live}
          interval={5500}
          items={matches.map((match) => ({
            id: String(match.id),
            content: (
              <Link
                href={`/live/matches/${match.id}`}
                aria-label={`${match.home.name} 대 ${match.away.name} ${matchStatusLabel(match).primary}`}
                className="text-label text-text-strong focus-visible:outline-accent hover:text-accent flex h-full min-w-0 flex-1 items-center justify-center gap-1.5 focus-visible:outline-2 focus-visible:-outline-offset-2"
              >
                <span className="min-w-0 flex-1 truncate text-right font-bold">
                  {predictionTeamLabel(match.home)}
                </span>
                <LiveCrest team={match.home} size={18} decorative />
                <span className="shrink-0 font-black tabular-nums">
                  {match.score.home !== null && match.score.away !== null
                    ? `${match.score.home}:${match.score.away}`
                    : "vs"}
                </span>
                <LiveCrest team={match.away} size={18} decorative />
                <span className="min-w-0 flex-1 truncate font-bold">
                  {predictionTeamLabel(match.away)}
                </span>
                <span
                  className={`text-caption shrink-0 font-bold ${match.status === "LIVE" ? "text-danger-strong" : "text-text-3"}`}
                >
                  {matchStatusLabel(match).primary}
                </span>
              </Link>
            ),
          }))}
        />
      )}
    </div>
  );
}

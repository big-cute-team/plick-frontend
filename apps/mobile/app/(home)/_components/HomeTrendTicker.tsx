"use client";
import Link from "next/link";
import { useRef } from "react";
import { useHomeTrends } from "@plick/core/home-queries";
import { useOnScreen } from "@plick/core/useOnScreen";
import { TEAM_CODES } from "@plick/domain/constants";
import { storyPath, teamHubPath } from "@plick/domain/format";
import type { TrendRanking } from "@plick/domain/types";
import { RotatingLine } from "@plick/ui/RotatingLine";
import { TrendDeltaBadge } from "@plick/ui/TrendDeltaBadge";

/** 한 줄에 한 순위씩 순서대로 넘기는 홈 실검. */
export function HomeTrendTicker({
  initial,
}: {
  initial: TrendRanking | undefined;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useOnScreen(ref);
  const { data, isError } = useHomeTrends(initial, visible);
  const items = (data?.items ?? []).map((item) => {
    const code = TEAM_CODES[item.entityId];
    const href =
      data?.type === "TEAM"
        ? code
          ? teamHubPath(code)
          : null
        : storyPath(String(item.entityId));
    const content = (
      <>
        <span className="text-accent shrink-0 font-black tabular-nums">
          {item.rank}
        </span>
        <span className="min-w-0 flex-1 truncate font-bold">{item.name}</span>
        <TrendDeltaBadge item={item} />
      </>
    );
    return {
      id: String(item.entityId),
      content: href ? (
        <Link
          href={href}
          className="text-body text-text-strong focus-visible:outline-accent hover:text-accent flex h-full min-w-0 flex-1 items-center gap-2 focus-visible:outline-2 focus-visible:-outline-offset-2"
        >
          {content}
        </Link>
      ) : (
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {content}
        </span>
      ),
    };
  });
  return (
    <div ref={ref} className="px-edge pt-3">
      {items.length ? (
        <RotatingLine
          label={data?.type === "TEAM" ? "구단 순위" : "실검"}
          items={items}
        />
      ) : (
        <div className="bg-elevate rounded-card text-label text-text-3 flex h-12 items-center gap-3 px-3">
          <span className="text-accent font-black">실검</span>
          {isError
            ? "순위를 불러오지 못했어요"
            : data
              ? "아직 집계된 순위가 없어요"
              : "순위를 불러오는 중"}
        </div>
      )}
    </div>
  );
}

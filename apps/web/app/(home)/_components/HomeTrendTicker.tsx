"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useHomeTrends } from "@plick/core/home-queries";
import { useOnScreen } from "@plick/core/useOnScreen";
import { TEAM_CODES } from "@plick/domain/constants";
import { storyPath, teamHubPath } from "@plick/domain/format";
import type { TrendRanking } from "@plick/domain/types";
import { RotatingLine } from "@plick/ui/RotatingLine";
import { TrendDeltaBadge } from "@plick/ui/TrendDeltaBadge";
import { TrendingRow } from "@plick/ui/TrendingRow";

/** 펼친 전체 순위 목록의 id. 띠의 펼치기 버튼이 `aria-controls`로 가리킨다. */
const TREND_LIST_ID = "home-trend-list";

/**
 * 한 줄에 한 순위씩 순서대로 넘기는 홈 실검. 오른쪽 끝 화살표를 누르면 띠 아래로 전체 순위
 * (`TRENDS_COUNT`개)가 펼쳐지고 다시 누르면 접힌다 (KAN-709). 펼친 동안 띠의 자동 회전은
 * 멈춘다. 줄은 우측 레일 급상승 상자와 같은 `TrendingRow`고 링크도 같다.
 *
 * @param initial 서버가 받아 둔 순위. 못 받았으면 undefined
 */
export function HomeTrendTicker({
  initial,
}: {
  initial: TrendRanking | undefined;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useOnScreen(ref);
  const { data, isError } = useHomeTrends(initial, visible);
  const [expanded, setExpanded] = useState(false);
  const type = data?.type === "TEAM" ? "TEAM" : "STORY";
  const items = (data?.items ?? []).map((item) => {
    const code = TEAM_CODES[item.entityId];
    const href =
      type === "TEAM"
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
    <div ref={ref} className="mb-3">
      {items.length ? (
        <>
          <RotatingLine
            label={type === "TEAM" ? "구단 순위" : "실검"}
            items={items}
            expanded={expanded}
            onToggle={() => setExpanded((value) => !value)}
            expandControls={TREND_LIST_ID}
          />
          {expanded && (
            <ol
              id={TREND_LIST_ID}
              aria-label={type === "TEAM" ? "구단 순위 전체" : "실검 전체"}
              className="bg-elevate rounded-card mt-1 px-3 py-1"
            >
              {(data?.items ?? []).map((item) => (
                <TrendingRow
                  key={item.entityId}
                  item={item}
                  type={type}
                  size="lg"
                  Link={Link}
                />
              ))}
            </ol>
          )}
        </>
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

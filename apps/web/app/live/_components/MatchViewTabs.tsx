"use client";

import { MATCH_VIEW_LABEL } from "@/_constants/live";
import type { MatchView } from "@/_types/live";

/**
 * 경기 상세 보기 전환 탭 (KAN-458) — "경기"와 "채팅". 팀 필터 탭과 같은 밑줄형에
 * hover·focus-visible을 얹었다. 제어형이다 — 선택은 `MatchDetailScreen`이 갖는다.
 *
 * @param views 이 경기 상태에서 보이는 보기들(순서대로)
 * @param active 지금 보기
 * @param onSelect 탭을 눌렀을 때
 */
export function MatchViewTabs({
  views,
  active,
  onSelect,
}: {
  views: MatchView[];
  active: MatchView;
  onSelect: (view: MatchView) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="경기 상세 보기"
      className="border-border mt-5 flex gap-5.5 border-b"
    >
      {views.map((key) => {
        const on = key === active;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onSelect(key)}
            className={`text-tab focus-visible:outline-accent border-b-2 px-1 py-3 focus-visible:outline-2 focus-visible:-outline-offset-2 ${
              on
                ? "border-accent text-text font-extrabold"
                : "text-text-4 hover:text-text-2 border-transparent font-semibold"
            }`}
          >
            {MATCH_VIEW_LABEL[key]}
          </button>
        );
      })}
    </div>
  );
}

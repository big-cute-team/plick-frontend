"use client";

import { MATCH_TAB_LABEL } from "@/_constants/live";
import type { MatchTabKey } from "@/_types/live";

/**
 * 경기 상세 본문 탭 줄 (KAN-458 경기/채팅 → KAN-462 요약·라인업·스탯). 네이버
 * 스포츠 상세의 탭 줄처럼 카드 위에 균등 폭으로 늘어놓고 밑줄로 지금 탭을
 * 표시한다. 제어형이다 — 선택은 `MatchDetailScreen`이 갖는다.
 *
 * @param tabs 이 경기 상태에서 보이는 탭들(순서대로)
 * @param active 지금 탭
 * @param onSelect 탭을 눌렀을 때
 */
export function MatchTabBar({
  tabs,
  active,
  onSelect,
}: {
  tabs: MatchTabKey[];
  active: MatchTabKey;
  onSelect: (tab: MatchTabKey) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="경기 상세 보기"
      className="bg-elevate border-border rounded-card flex overflow-hidden border"
    >
      {tabs.map((key) => {
        const on = key === active;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onSelect(key)}
            className={`text-title focus-visible:outline-accent flex-1 border-b-2 py-3.5 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 ${
              on
                ? "border-accent text-accent font-extrabold"
                : "text-text-4 hover:text-text-2 border-transparent font-semibold"
            }`}
          >
            {MATCH_TAB_LABEL[key]}
          </button>
        );
      })}
    </div>
  );
}

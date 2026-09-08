"use client";

import { MATCH_TAB_LABEL } from "@/_constants/live";
import type { MatchTabKey } from "@/_types/live";

/**
 * 경기 상세 탭 줄 (KAN-452 요약·라인업·스탯, KAN-458에서 프리뷰·채팅이 붙어
 * 상태별 조합으로). 제어형이다 — 선택은 `MatchDetailScreen`이 갖는다. 채팅 탭은
 * 스크롤 영역 밖(입력바를 하단에 고정해야 한다)에 그려야 해서 탭 줄을 본문에서
 * 떼어 냈다.
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
      className="border-border flex shrink-0 border-b"
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
            className={`text-body flex-1 border-b-2 pt-2 pb-2.5 font-bold ${
              on
                ? "border-accent text-accent"
                : "text-text-4 border-transparent"
            }`}
          >
            {MATCH_TAB_LABEL[key]}
          </button>
        );
      })}
    </div>
  );
}

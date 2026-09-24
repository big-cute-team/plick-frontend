"use client";

import { MATCH_TAB_LABEL } from "@/_constants/live";
import type { MatchTabKey } from "@/_types/live";

/**
 * 경기 상세 탭 줄 (KAN-452 요약·라인업·스탯, KAN-458에서 프리뷰·채팅이 붙어
 * 상태별 조합으로, KAN-567 시안 톤). 왼쪽 정렬에 탭 사이 20px, 탭은 13.5px이고
 * 활성은 700 진한 글자에 아래 2px 강조 밑줄, 비활성은 500 보조색이다. 줄 아래
 * 섹션 구분선이 깔린다. 제어형이다. 선택은 `MatchDetailScreen`이 갖는다. 헤더와
 * 함께 스크롤 밖에 고정된다(`shrink-0`).
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
      className="border-border px-edge flex shrink-0 gap-5 border-b"
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
            className={`text-body -mb-px border-b-2 pt-3 pb-2.5 ${
              on
                ? "border-accent text-text-strong font-bold"
                : "text-text-3 border-transparent font-medium"
            }`}
          >
            {MATCH_TAB_LABEL[key]}
          </button>
        );
      })}
    </div>
  );
}

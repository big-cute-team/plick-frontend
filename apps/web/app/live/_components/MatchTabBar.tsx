"use client";

import { MATCH_TAB_LABEL } from "@/_constants/live";
import type { MatchTabKey } from "@/_types/live";

/**
 * 경기 상세 본문 탭 줄 (KAN-462 → KAN-567 시안 경기 상세 855-859행). 글자 탭 13.5를
 * 20px 간격으로 늘어놓고 활성 탭은 700 제목색에 강조색 2px 밑줄이다. 줄 아래는
 * 섹션 구분선. 제어형이다. 선택은 `MatchDetailScreen`이 갖는다.
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
      className="border-border flex items-center gap-5 border-b"
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
            className={`text-body focus-visible:outline-accent -mb-px border-b-2 pb-2.25 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
              on
                ? "border-accent text-text-strong font-bold"
                : "hover:text-text-strong text-text-3 border-transparent font-medium"
            }`}
          >
            {MATCH_TAB_LABEL[key]}
          </button>
        );
      })}
    </div>
  );
}

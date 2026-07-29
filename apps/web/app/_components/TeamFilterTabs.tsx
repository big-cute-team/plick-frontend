"use client";

import { TEAMS, TEAM_ORDER } from "@plick/domain/constants";
import type { Filter } from "@plick/domain/types";

/**
 * 팀 필터 탭 (전체 + 빅6) — 데스크톱은 밑줄형 탭에 hover 상태를 더한다.
 * 홈("지금 올라온 소식")·기사 페이지가 공용으로 쓴다. 제어형: 선택 상태는
 * 부모(PostFeed)가 소유한다.
 *
 * @param value - 현재 선택된 필터
 * @param onChange - 탭 선택 시 호출되는 콜백
 */
export function TeamFilterTabs({
  value,
  onChange,
}: {
  value: Filter;
  onChange: (f: Filter) => void;
}) {
  const items: { key: Filter; label: string }[] = [
    { key: "ALL", label: "전체" },
    ...TEAM_ORDER.map((code) => ({ key: code, label: TEAMS[code].name })),
  ];

  return (
    <div className="border-border flex gap-5.5 overflow-x-auto border-b">
      {/* 좁은 폭(≤330)에서 탭이 넘치면 가로 스크롤 — 스크롤바는 theme.css가 전역으로 숨긴다 */}
      {items.map(({ key, label }) => {
        const on = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-pressed={on}
            className={`text-tab focus-visible:outline-accent shrink-0 border-b-2 py-3 focus-visible:outline-2 focus-visible:-outline-offset-2 ${
              on
                ? "border-accent text-text font-extrabold"
                : "text-text-4 hover:text-text-2 border-transparent font-semibold"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { TEAMS, TEAM_ORDER } from "@plick/domain/constants";
import type { Filter } from "@plick/domain/types";

/**
 * 팀 필터 탭 (전체 + 빅6) — 제어형: 선택 상태는 부모(NewsFeed)가 소유한다.
 *
 * 가로 스크롤이라 좁은 화면(폴드 접힘)에서도 넘치지 않는다.
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
    <div className="no-scrollbar border-border px-edge flex gap-4 overflow-x-auto border-b">
      {items.map(({ key, label }) => {
        const on = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`text-label shrink-0 border-b-2 pt-1 pb-2 font-bold ${
              on ? "border-accent text-text" : "text-text-4 border-transparent"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { useState } from "react";
import { TEAMS, TEAM_ORDER } from "@plick/domain/constants";
import type { Filter } from "@plick/domain/types";

/**
 * 팀 필터 탭 (전체 + 빅6).
 *
 * 가로 스크롤이라 좁은 화면(폴드 접힘)에서도 넘치지 않는다.
 *
 * @param onChange - 선택이 바뀔 때 호출되는 콜백
 */
export function TeamFilterTabs({
  onChange,
}: {
  onChange?: (f: Filter) => void;
}) {
  const [active, setActive] = useState<Filter>("ALL");

  function select(f: Filter) {
    setActive(f);
    onChange?.(f);
  }

  const items: { key: Filter; label: string }[] = [
    { key: "ALL", label: "전체" },
    ...TEAM_ORDER.map((code) => ({ key: code, label: TEAMS[code].name })),
  ];

  return (
    <div className="no-scrollbar border-border px-edge flex gap-4 overflow-x-auto border-b">
      {items.map(({ key, label }) => {
        const on = active === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => select(key)}
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

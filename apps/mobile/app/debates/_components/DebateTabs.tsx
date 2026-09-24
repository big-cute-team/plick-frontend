"use client";

import type { MouseEvent } from "react";
import { DEBATE_TABS } from "@/_constants/debates";
import type { DebateTab } from "@/_types/debates";
import { debateTabPath } from "@/_utils/debates";

/**
 * 투표 화면의 탭 줄 (KAN-567, 시안 투표 탭). 진행 중과 마감 둘이고 제어형이라
 * 선택 상태는 부모(`DebatesFeed`)가 URL에서 읽어 준다.
 *
 * MY 활동 탭(`ActivityTabs`)과 같은 생김새다. 앵커인 이유도 같다. 새 탭 열기는
 * 링크 본연의 동작에 맡기고 보통 클릭만 가로채 `onChange`로 넘긴다. 스크롤 영역
 * 상단에 붙어(sticky) 리스트를 내린 뒤에도 탭을 바꿀 수 있다.
 *
 * @param value 지금 보는 탭
 * @param onChange 탭 선택 콜백
 */
export function DebateTabs({
  value,
  onChange,
}: {
  value: DebateTab;
  onChange: (tab: DebateTab) => void;
}) {
  function intercept(e: MouseEvent<HTMLAnchorElement>, key: DebateTab) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onChange(key);
  }

  return (
    <div
      /* -top-px: 소수점 스크롤 위치의 픽셀 반올림 실금을 배경으로 덮는다 (KAN-386) */
      className="border-border px-edge bg-bg sticky -top-px z-10 flex gap-5 border-b"
    >
      {DEBATE_TABS.map(({ key, label }) => {
        const on = value === key;
        return (
          <a
            key={key}
            href={debateTabPath(key)}
            onClick={(e) => intercept(e, key)}
            aria-current={on ? "page" : undefined}
            className={`text-tab shrink-0 border-b-2 pt-3 pb-2.5 ${
              on
                ? "border-accent text-text-strong font-bold"
                : "text-text-3 border-transparent font-medium"
            }`}
          >
            {label}
          </a>
        );
      })}
    </div>
  );
}

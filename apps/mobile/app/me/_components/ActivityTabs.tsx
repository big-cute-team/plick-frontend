"use client";

import type { MouseEvent } from "react";
import { ACTIVITY_TABS } from "@/_constants/activity";
import type { ActivityTab } from "@/_types/activity";
import { activityTabPath } from "@/_utils/activity";

/**
 * MY 활동 탭 줄 (KAN-495, KAN-567 리디자인). 내 댓글·좋아요·투표 셋이고
 * 제어형이라 선택 상태는 부모(`MeActivityFeed`)가 URL에서 읽어 준다. 옛 화면이
 * 라벨 옆에 달던 개수는 머리의 "댓글 N, 좋아요 N"으로 올라갔다.
 *
 * 앵커인 이유는 팀 필터 탭과 같다. 새 탭 열기는 링크 본연의 동작에 맡기고
 * 보통 클릭만 가로채 `onChange`로 넘긴다. 스크롤 영역 상단에 붙어(sticky)
 * 리스트를 내린 뒤에도 탭을 바꿀 수 있다.
 *
 * @param value 지금 보는 탭
 * @param onChange 탭 선택 콜백
 */
export function ActivityTabs({
  value,
  onChange,
}: {
  value: ActivityTab;
  onChange: (tab: ActivityTab) => void;
}) {
  function intercept(e: MouseEvent<HTMLAnchorElement>, key: ActivityTab) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onChange(key);
  }

  return (
    <div
      /* -top-px: 소수점 스크롤 위치의 픽셀 반올림 실금을 배경으로 덮는다 (KAN-386) */
      className="border-border px-edge bg-bg sticky -top-px z-10 flex gap-5 border-b pt-4.5"
    >
      {ACTIVITY_TABS.map(({ key, label }) => {
        const on = value === key;
        return (
          <a
            key={key}
            href={activityTabPath(key)}
            onClick={(e) => intercept(e, key)}
            aria-current={on ? "page" : undefined}
            className={`text-tab shrink-0 border-b-2 pb-2.5 ${
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

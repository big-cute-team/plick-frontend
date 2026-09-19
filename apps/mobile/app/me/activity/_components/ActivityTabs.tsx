"use client";

import type { MouseEvent } from "react";
import { formatCount } from "@plick/domain/format";
import { ACTIVITY_TABS } from "@/_constants/activity";
import type { ActivityTab, MyActivityCounts } from "@/_types/activity";
import { activityTabPath } from "@/_utils/activity";

/**
 * 활동 화면의 탭 (KAN-495). 좋아요한 기사·내가 쓴 댓글 둘이고, 라벨 옆에 활동
 * 개수를 붙인다. 제어형이라 선택 상태는 부모(`ActivityFeed`)가 URL에서 읽어 준다.
 *
 * 팀 필터 탭(`TeamFilterTabs`)과 같은 생김새다. 앵커인 이유도 같다. 새 탭
 * 열기는 링크 본연의 동작에 맡기고 보통 클릭만 가로채 `onChange`로 넘긴다.
 * 스크롤 영역 상단에 붙어(sticky) 리스트를 내린 뒤에도 탭을 바꿀 수 있다.
 *
 * @param value 지금 보는 탭
 * @param counts 활동 개수. 아직 못 받았으면 라벨만 그린다
 * @param onChange 탭 선택 콜백
 */
export function ActivityTabs({
  value,
  counts,
  onChange,
}: {
  value: ActivityTab;
  counts?: MyActivityCounts;
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
      className="border-border px-edge bg-bg sticky -top-px z-10 flex gap-5 border-b"
    >
      {ACTIVITY_TABS.map(({ key, label }) => {
        const on = value === key;
        const count =
          counts && (key === "likes" ? counts.likeCount : counts.commentCount);
        return (
          <a
            key={key}
            href={activityTabPath(key)}
            onClick={(e) => intercept(e, key)}
            aria-current={on ? "page" : undefined}
            className={`text-title flex shrink-0 items-baseline gap-1.5 border-b-2 pt-1 pb-2 font-bold ${
              on ? "border-accent text-text" : "text-text-4 border-transparent"
            }`}
          >
            {label}
            {count !== undefined && (
              <span
                className={`text-label font-extrabold ${on ? "text-accent" : "text-text-4"}`}
              >
                {formatCount(count)}
              </span>
            )}
          </a>
        );
      })}
    </div>
  );
}

"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { DEBATE_TABS } from "@/_constants/debates";
import type { DebateTab } from "@/_types/debates";

/**
 * 투표 탭 줄 (KAN-567 시안 투표 1064-1213행). 진행 중, 마감 두 링크이고 지금 탭은 밑줄과
 * 굵은 글자다. 링크 href는 `?tab=`이라 새 탭 열기와 크롤러는 URL을 그대로 쓴다.
 *
 * 지금 탭은 부모(`DebatesFeed`)가 `useDebateTab`으로 읽어 준다 (KAN-683). 전에는 이 줄이
 * 직접 `useSearchParams`를 읽어 Suspense 안에 살았는데, 그 훅은 정적 페이지에서 Suspense
 * 경계까지 클라 렌더로 미뤄 서버 HTML에 목록이 안 실리게 했다. 보통 클릭은 가로채
 * `onSelect`로 넘기고(URL은 replaceState), 수정키 클릭은 링크 본연의 동작에 맡긴다.
 * `onSelect`가 없으면(Suspense fallback) 그냥 링크다.
 *
 * @param tab 지금 탭
 * @param onSelect 탭 선택 콜백. 없으면 링크 이동
 */
export function DebateTabBar({
  tab,
  onSelect,
}: {
  tab: DebateTab;
  onSelect?: (tab: DebateTab) => void;
}) {
  function intercept(e: MouseEvent<HTMLAnchorElement>, key: DebateTab) {
    if (!onSelect) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onSelect(key);
  }

  return (
    <div
      role="tablist"
      aria-label="투표 상태"
      className="border-border flex items-center gap-5 border-b"
    >
      {DEBATE_TABS.map(({ key, label, href }) => {
        const on = key === tab;
        return (
          <Link
            key={key}
            href={href}
            role="tab"
            aria-selected={on}
            onClick={(e) => intercept(e, key)}
            className={`text-body focus-visible:outline-accent -mb-px border-b-2 pb-2.25 focus-visible:outline-2 focus-visible:outline-offset-2 ${
              on
                ? "border-accent text-text-strong font-bold"
                : "hover:text-text-strong text-text-3 border-transparent font-medium"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}

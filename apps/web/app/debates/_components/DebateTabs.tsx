"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DEBATE_TABS } from "@/_constants/debates";
import type { DebateTab } from "@/_types/debates";
import { debateTabFrom } from "@/_utils/debates";

/**
 * 투표 탭 줄 (KAN-567 시안 투표 1064-1213행). 진행 중, 마감 두 링크이고 지금 탭은 밑줄과
 * 굵은 글자다. 탭의 원본은 URL `?tab=`이라 링크로 그린다.
 *
 * 지금 탭을 브라우저에서 `useSearchParams`로 읽는다 (KAN-667). 전에는 페이지가 `searchParams`를
 * 읽어 prop으로 내려줬는데, 서버가 쿼리를 읽는 순간 그 라우트는 요청마다 렌더가 돼 익명 ISR이
 * 안 된다. `useSearchParams`는 정적 페이지에서 가장 가까운 Suspense 경계까지 클라이언트 렌더로
 * 미루므로 호출부가 감싸고, fallback에는 쿼리를 읽지 않는 {@link DebateTabBar}를 기본 탭으로 둔다.
 * 서버 HTML은 그 fallback이고 브라우저가 쿼리를 읽어 맞춘다.
 */
export function DebateTabs() {
  return <DebateTabBar tab={debateTabFrom(useSearchParams().get("tab"))} />;
}

/**
 * 탭 줄의 표시 부분. 쿼리를 읽지 않아 서버 렌더와 Suspense fallback에 그대로 쓴다.
 *
 * @param tab 지금 탭
 */
export function DebateTabBar({ tab }: { tab: DebateTab }) {
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

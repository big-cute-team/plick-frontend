"use client";

import type { MouseEvent } from "react";
import { TEAMS, TEAM_ORDER } from "@plick/domain/constants";
import { teamHubPath } from "@plick/domain/format";
import type { Filter } from "@plick/domain/types";

/**
 * 팀 필터 탭 (전체 + 빅6) — 제어형: 선택 상태는 부모(NewsFeed)가 소유한다.
 *
 * 버튼이 아니라 앵커다 (KAN-350). href가 팀 허브(`/teams/[slug]`)를 가리켜야
 * 크롤러가 내부 링크를 따라 팀 페이지를 발견한다 — 어디서도 링크 안 된 페이지는
 * 구글이 못 찾는다(SEO 전략 Step 2-2). 사용자 클릭은 가로채서 `onChange`에
 * 넘기므로 페이지 이동 없이 기존 필터 UX 그대로다. 새 탭 열기(cmd/ctrl·중클릭)는
 * 가로채지 않고 링크 본연의 동작에 맡긴다.
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

  function intercept(e: MouseEvent<HTMLAnchorElement>, key: Filter) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onChange(key);
  }

  return (
    <div className="no-scrollbar border-border px-edge flex gap-4 overflow-x-auto border-b">
      {items.map(({ key, label }) => {
        const on = value === key;
        return (
          <a
            key={key}
            href={teamHubPath(key)}
            onClick={(e) => intercept(e, key)}
            aria-current={on ? "page" : undefined}
            className={`text-title shrink-0 border-b-2 pt-1 pb-2 font-bold ${
              on ? "border-accent text-text" : "text-text-4 border-transparent"
            }`}
          >
            {label}
          </a>
        );
      })}
    </div>
  );
}

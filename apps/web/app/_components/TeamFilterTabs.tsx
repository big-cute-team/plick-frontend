"use client";

import type { MouseEvent } from "react";
import { TEAMS, TEAM_ORDER } from "@plick/domain/constants";
import { teamHubPath } from "@plick/domain/format";
import type { Filter } from "@plick/domain/types";

/**
 * 팀 필터 탭 (전체 + 빅6) — 데스크톱은 밑줄형 탭에 hover 상태를 더한다.
 * 홈("지금 올라온 소식")·기사 페이지가 공용으로 쓴다. 제어형: 선택 상태는
 * 부모(PostFeed)가 소유한다.
 *
 * 버튼이 아니라 앵커다 (KAN-350). href가 그 surface의 팀 필터 URL을 가리켜야
 * 크롤러가 내부 링크를 따라 팀 페이지를 발견한다 — 어디서도 링크 안 된
 * 페이지는 구글이 못 찾는다(SEO 전략 Step 2-2). 사용자 클릭은 가로채서
 * `onChange`에 넘기므로 페이지 이동 없이 기존 필터 UX 그대로다. 새 탭 열기
 * (cmd/ctrl·중클릭)는 가로채지 않고 링크 본연의 동작에 맡긴다.
 *
 * GNB(h-16) 바로 아래에 붙는다(sticky) — 리스트를 한참 내린 뒤에도 맨 위로
 * 돌아오지 않고 팀을 바꿀 수 있다. 밑으로 지나가는 리스트가 비치지 않게
 * 배경(`bg-bg`)을 깐다. top 값은 `SiteHeader` 높이와 짝이다.
 *
 * @param value - 현재 선택된 필터
 * @param onChange - 탭 선택 시 호출되는 콜백
 * @param hrefFor - 필터 → 이 surface의 URL. 홈은 teamHubPath(기본값),
 *   기사 페이지는 articlesTeamPath.
 */
export function TeamFilterTabs({
  value,
  onChange,
  hrefFor = teamHubPath,
}: {
  value: Filter;
  onChange: (f: Filter) => void;
  hrefFor?: (f: Filter) => string;
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
    <div className="border-border bg-bg sticky top-16 z-10 flex gap-5.5 overflow-x-auto border-b">
      {/* 좁은 폭(≤330)에서 탭이 넘치면 가로 스크롤 — 스크롤바는 theme.css가 전역으로 숨긴다 */}
      {items.map(({ key, label }) => {
        const on = value === key;
        return (
          <a
            key={key}
            href={hrefFor(key)}
            onClick={(e) => intercept(e, key)}
            aria-current={on ? "page" : undefined}
            className={`text-tab focus-visible:outline-accent shrink-0 border-b-2 py-3 focus-visible:outline-2 focus-visible:-outline-offset-2 ${
              on
                ? "border-accent text-text font-extrabold"
                : "text-text-4 hover:text-text-2 border-transparent font-semibold"
            }`}
          >
            {label}
          </a>
        );
      })}
    </div>
  );
}

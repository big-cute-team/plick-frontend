"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import { TEAMS, TEAM_ORDER } from "@plick/domain/constants";
import { teamHubPath } from "@plick/domain/format";
import type { Filter } from "@plick/domain/types";

/**
 * 팀 탭 (전체 + 빅6) — 표 위의 글자 탭 줄. 홈과 기사 페이지가 공용으로 쓴다.
 * 제어형: 선택 상태는 부모(PostFeed)가 소유한다.
 *
 * 시안(KAN-567)은 높이 32에 밑선 하나, 항목은 12.5px이고 활성은 강조색 700,
 * 비활성은 보조 회색이다. 항목 사이는 오른쪽 여백 15px이다. 전에는 밑줄형
 * 탭(14px, 활성 2px 밑줄)이었다. 시안의 "기타" 탭은 빅6 밖 팀 필터 API가 없어
 * 뺐다(API 공백).
 *
 * 버튼이 아니라 앵커다 (KAN-350). href가 그 surface의 팀 필터 URL을 가리켜야
 * 크롤러가 내부 링크를 따라 팀 페이지를 발견한다 — 어디서도 링크 안 된
 * 페이지는 구글이 못 찾는다(SEO 전략 Step 2-2). 사용자 클릭은 가로채서
 * `onChange`에 넘기므로 페이지 이동 없이 기존 필터 UX 그대로다. 새 탭 열기
 * (cmd/ctrl·중클릭)는 가로채지 않고 링크 본연의 동작에 맡긴다.
 *
 * sticky는 `PostFeed`가 표 머리와 한 덩어리로 건다 — 리스트를 한참 내린 뒤에도
 * 맨 위로 돌아오지 않고 팀을 바꿀 수 있다.
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

  /**
   * 선택된 탭을 가로 스크롤 안으로 끌어온다 (KAN-386, 모바일과 같은 판단).
   * 좁은 폭에서 반쯤 잘린 탭을 클릭해도 그대로 잘려 있어 어디를 골랐는지 안
   * 보인다. `value` 변화에 반응하므로 클릭이든 URL 직접 진입이든 다 잡고,
   * `nearest`라 이미 다 보이는 탭에는 아무 일도 하지 않는다.
   */
  const listRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  useEffect(() => {
    listRef.current?.querySelector("[aria-current]")?.scrollIntoView({
      behavior: mounted.current ? "smooth" : "auto",
      block: "nearest",
      inline: "nearest",
    });
    mounted.current = true;
  }, [value]);

  return (
    <div
      ref={listRef}
      className="border-border no-scrollbar flex h-8 items-center overflow-x-auto border-b"
    >
      {/* 좁은 폭(≤330)에서 탭이 넘치면 가로 스크롤 — 스크롤바는 no-scrollbar가 숨긴다 */}
      {items.map(({ key, label }) => {
        const on = value === key;
        return (
          <a
            key={key}
            href={hrefFor(key)}
            onClick={(e) => intercept(e, key)}
            aria-current={on ? "page" : undefined}
            className={`text-label-lg focus-visible:outline-accent shrink-0 scroll-mx-6 pr-3.75 whitespace-nowrap focus-visible:outline-2 focus-visible:-outline-offset-2 ${
              on
                ? "text-accent font-bold"
                : "text-text-3 hover:text-text-strong font-medium"
            }`}
          >
            {label}
          </a>
        );
      })}
    </div>
  );
}

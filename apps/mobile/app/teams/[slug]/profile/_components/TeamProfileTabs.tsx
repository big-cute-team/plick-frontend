"use client";

import { useState, type ReactNode } from "react";
import type { TeamSquad } from "@plick/domain/live";
import type { FigureTag } from "@plick/domain/types";
import {
  TEAM_PROFILE_TAB_LABEL,
  TEAM_PROFILE_TABS,
} from "@/_constants/team-profile";
import { useScreenTabView } from "@/_hooks/useScreenTabView";
import type { TeamProfileTabKey } from "@/_types/team-profile";
import { SquadRows } from "./SquadRows";
import { TeamFiguresList } from "./TeamFiguresList";

/**
 * 팀 프로필 본문 탭 (KAN-574). 선수단, 기사 속 인물, 팀 정보(관련 이슈 + 기본
 * 정보)를 탭으로 가른다. 세 덩어리를 세로로 이어 붙이면 선수단만으로 화면 몇 장이라
 * 기사 속 인물까지 한참 내려가야 했다. 탭 줄은 스크롤 영역 위에 붙어(sticky) 어디서든
 * 바로 바꿀 수 있다. 생김새는 경기 상세 탭 줄(`MatchTabBar`)과 같다.
 *
 * 탭은 URL로 승격하지 않고 컴포넌트 상태로 둔다(웹 `TeamProfileTabs`와 같은 판단).
 * 팀 정보는 서버에서 그린 조각을 `info`로 받는다.
 *
 * @param slug 팀 slug. 탭 전환 이벤트의 ref (KAN-543)
 * @param squad 이번 시즌 등록 명단. 못 받았으면 null
 * @param figures 기사에서 뽑은 소속 인물
 * @param info 팀 정보 탭 내용
 */
export function TeamProfileTabs({
  slug,
  squad,
  figures,
  info,
}: {
  slug: string;
  squad: TeamSquad | null;
  figures: FigureTag[];
  info: ReactNode;
}) {
  const [active, setActive] = useState<TeamProfileTabKey>("squad");
  /* 탭 전환은 서버 요청이 없어 여기서 화면 전환으로 센다 (KAN-543) */
  useScreenTabView("team_profile", active, slug);

  return (
    <>
      <div
        role="tablist"
        aria-label="팀 프로필 보기"
        className="border-border bg-bg -mx-edge px-edge sticky top-0 z-10 mt-3 flex gap-5 border-b"
      >
        {TEAM_PROFILE_TABS.map((key) => {
          const on = key === active;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(key)}
              className={`text-body -mb-px border-b-2 pt-3 pb-2.5 ${
                on
                  ? "border-accent text-text-strong font-bold"
                  : "text-text-3 border-transparent font-medium"
              }`}
            >
              {TEAM_PROFILE_TAB_LABEL[key]}
            </button>
          );
        })}
      </div>

      {active === "squad" &&
        (squad ? (
          <SquadRows squad={squad} />
        ) : (
          <p className="text-body text-text-4 py-6">
            선수단을 불러오지 못했어요
          </p>
        ))}
      {active === "figures" &&
        (figures.length > 0 ? (
          <TeamFiguresList figures={figures} />
        ) : (
          <p className="text-body text-text-4 py-6">
            아직 등록된 소속 인물이 없어요
          </p>
        ))}
      {active === "info" && info}
    </>
  );
}

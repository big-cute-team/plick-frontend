"use client";

import { useState } from "react";
import { LIVE_SEASON_LABEL, type TeamSquad } from "@plick/domain/live";
import type { FigureTag } from "@plick/domain/types";
import { TEAM_PROFILE_TAB_LABEL } from "@/_constants/team-profile";
import { useScreenTabView } from "@/_hooks/useScreenTabView";
import type { TeamProfileTabKey } from "@/_types/team-profile";
import { SquadTable } from "./SquadTable";
import { TeamFiguresList } from "./TeamFiguresList";

/**
 * 팀 프로필 본문 탭 (KAN-484 → KAN-567 톤 정리) — 선수단과 기사에 나온 인물을
 * 주제별로 가른다. 시안의 "선수단" 섹션 제목 15/900 + "2026-27 프리미어리그" 줄
 * 자리에 탭 둘을 세운다(경기 상세 탭 줄과 같은 글자 탭). 둘은 출처도 쓰임도 다른
 * 목록이라(한쪽은 이번 시즌 등록 명단, 다른 쪽은 기사에서 뽑은 인물 사전) 한 화면에
 * 같이 있을 이유는 있어도 세로로 이어 붙일 이유는 없었다.
 *
 * 탭은 URL로 승격하지 않고 컴포넌트 상태로 둔다. 팀 프로필의 색인 대상은 팀 자체지
 * 탭이 아니다. 두 목록 다 첫 HTML에 들어간다.
 *
 * @param squad 이번 시즌 등록 명단. 못 받았으면 null
 * @param figures 기사에서 뽑은 소속 인물
 */
export function TeamProfileTabs({
  slug,
  squad,
  figures,
}: {
  /** 팀 slug. 탭 전환 이벤트의 ref (KAN-543) */
  slug: string;
  squad: TeamSquad | null;
  figures: FigureTag[];
}) {
  const [active, setActive] = useState<TeamProfileTabKey>("squad");
  /* 탭 전환은 서버 요청이 없어 여기서 화면 전환으로 센다 (KAN-543) */
  useScreenTabView("team_profile", active, slug);

  return (
    <>
      <div
        role="tablist"
        aria-label="팀 프로필 보기"
        className="flex items-baseline gap-4 pb-2"
      >
        {(["squad", "figures"] as const).map((key) => {
          const on = key === active;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(key)}
              className={`focus-visible:outline-accent tracking-tight transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                on
                  ? "text-body-lg text-text-strong font-black"
                  : "text-body hover:text-text-strong text-text-3 font-medium"
              }`}
            >
              {TEAM_PROFILE_TAB_LABEL[key]}
            </button>
          );
        })}
        <span className="text-caption-lg text-text-3">
          {LIVE_SEASON_LABEL} 프리미어리그
        </span>
      </div>

      {active === "squad" ? (
        squad ? (
          <SquadTable squad={squad} />
        ) : (
          <p className="text-body-md text-text-4 py-10">
            선수단을 불러오지 못했어요
          </p>
        )
      ) : (
        <TeamFiguresList figures={figures} />
      )}
    </>
  );
}

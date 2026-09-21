"use client";

import { useState } from "react";
import { LIVE_SEASON_LABEL, type TeamSquad } from "@plick/domain/live";
import type { FigureTag } from "@plick/domain/types";
import { TEAM_PROFILE_TAB_LABEL } from "@/_constants/team-profile";
import { useScreenTabView } from "@/_hooks/useScreenTabView";
import type { TeamProfileTabKey } from "@/_types/team-profile";
import { SquadGrid } from "./SquadGrid";
import { TeamFiguresList } from "./TeamFiguresList";

/**
 * 팀 프로필 본문 탭 (KAN-484) — 선수단과 기사에 나온 인물을 주제별로 가른다.
 * 모바일 `TeamProfileTabs`와 같은 구성이고, 탭 줄만 경기 상세의 데스크톱
 * 탭 줄(`MatchTabBar`)처럼 카드로 세운다.
 *
 * KAN-507에서 두 명단을 한 장에 합쳤는데, 섹션을 위아래로 쌓다 보니 선수단
 * 33명을 다 지나야 인물 목록이 나왔다. 둘은 출처도 쓰임도 다른 목록이라(한쪽은
 * 이번 시즌 등록 명단, 다른 쪽은 기사에서 뽑은 인물 사전) 한 화면에 같이 있을
 * 이유는 있어도 세로로 이어 붙일 이유는 없었다.
 *
 * 탭은 URL로 승격하지 않고 컴포넌트 상태로 둔다 — 경기 상세 탭과 같은 판단이고,
 * 팀 프로필의 색인 대상은 팀 자체지 탭이 아니다. 두 목록 다 첫 HTML에 들어간다.
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
        className="bg-elevate border-border rounded-card mb-6 flex overflow-hidden border"
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
              className={`text-title focus-visible:outline-accent flex-1 border-b-2 py-3.5 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 ${
                on
                  ? "border-accent text-accent font-extrabold"
                  : "text-text-4 hover:text-text-2 border-transparent font-semibold"
              }`}
            >
              {TEAM_PROFILE_TAB_LABEL[key]}
            </button>
          );
        })}
      </div>

      {active === "squad" ? (
        squad ? (
          <>
            {/* 외부 명단이라 이적 반영이 늦을 수 있다는 건 라이브 화면에서부터
                달고 있던 안내다 */}
            <p className="text-body text-text-4 pb-4 font-semibold">
              {LIVE_SEASON_LABEL} · {squad.size}명 · 이적 반영이 며칠 늦을 수
              있어요
            </p>
            <SquadGrid squad={squad} />
          </>
        ) : (
          <p className="text-body-lg text-text-4 py-16 text-center">
            선수단을 불러오지 못했어요.
          </p>
        )
      ) : (
        <TeamFiguresList figures={figures} />
      )}
    </>
  );
}

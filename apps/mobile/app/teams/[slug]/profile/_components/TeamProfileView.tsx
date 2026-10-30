"use client";

import { useState, type ReactNode } from "react";
import {
  competitionOptions,
  PREMIER_LEAGUE_ID,
  type CompetitionOption,
  type TeamCompetitionStats,
  type TeamInjury,
  type TeamSquadMember,
} from "@plick/domain/team-profile";
import { CompetitionPicker } from "@/_components/CompetitionPicker";
import { ProfileTabBar } from "@/_components/ProfileTabBar";
import { TabPanel } from "@/_components/TabPanel";
import { TEAM_PROFILE_TABS } from "@/_constants/team-profile";
import { useScreenTabView } from "@/_hooks/useScreenTabView";
import type { TeamProfileTabKey } from "@/_types/team-profile";
import { LiveLoadError } from "@/live/_components/LiveLoadError";
import { TeamSquadList } from "./TeamSquadList";
import { TeamStatsPanel } from "./TeamStatsPanel";

/**
 * 팀 프로필 탭 줄과 본문 (KAN-604, 시안 팀 프로필 모바일). 탭(개요, 경기, 선수단, 기록)과
 * 대회 선택을 상태로 갖는다. 탭은 URL에 올리지 않아 프로필을 열 때마다 개요로 시작한다.
 * 탭 줄은 스크롤 본문 안에서 위에 붙는다(sticky).
 *
 * 개요와 경기 탭은 대회와 무관해 서버가 그린 노드로 받는다. 선수단과 기록 탭만 선택한
 * 대회를 따라 여기서 그린다. 대회 선택 UI는 KAN-597이 갈아 끼울 자리라
 * `CompetitionPicker` 하나로 분리했고 기본값은 프리미어리그다(웹 KAN-599와 같다).
 *
 * 선수단이 비어 있으면 선수단 탭을 뺀다. 못 받았으면(null) 탭은 두고 본문에 다시 시도를 띄운다.
 *
 * @param slug 팀 slug. 탭 전환 이벤트의 ref (KAN-543)
 * @param overview 개요 탭 본문
 * @param matches 경기 탭 본문
 * @param squad 선수단과 그 대회 목록. null이면 불러오지 못한 것
 * @param stats 대회별 팀 기록. null이면 불러오지 못한 것
 * @param injuries 다음 경기 기준 결장자(기록 탭 아래)
 */
export function TeamProfileView({
  slug,
  overview,
  matches,
  squad,
  stats,
  injuries,
}: {
  slug: string;
  overview: ReactNode;
  matches: ReactNode;
  squad: {
    players: TeamSquadMember[];
    competitions: CompetitionOption[];
  } | null;
  stats: TeamCompetitionStats[] | null;
  injuries: TeamInjury[];
}) {
  const options = competitionOptions(stats ?? [], squad?.competitions ?? []);
  const [tab, setTab] = useState<TeamProfileTabKey>("overview");
  const [competitionId, setCompetitionId] = useState(
    options.some((o) => o.id === PREMIER_LEAGUE_ID)
      ? PREMIER_LEAGUE_ID
      : (options[0]?.id ?? PREMIER_LEAGUE_ID),
  );
  /* 탭 전환은 서버 요청이 없어 여기서 화면 전환으로 센다 (KAN-543) */
  useScreenTabView("team_profile", tab, slug);

  const tabs = TEAM_PROFILE_TABS.filter(
    ({ key }) => key !== "squad" || squad === null || squad.players.length > 0,
  );
  /* 대회가 둘 이상일 때만 고를 게 있다. 이 판정 하나를 선수단과 기록이 같이 쓴다 */
  const picker =
    options.length > 1 ? (
      <CompetitionPicker
        options={options}
        value={competitionId}
        onChange={setCompetitionId}
      />
    ) : null;

  return (
    <>
      <div className="h-4" />
      <ProfileTabBar
        label="팀 프로필 보기"
        tabs={tabs}
        active={tab}
        onSelect={setTab}
        idPrefix="team-profile"
      />
      {/* 네 탭을 전부 그리고 비활성은 hidden (KAN-683). 선수단·기록이 서버 HTML에 실린다 */}
      <TabPanel
        on={tab === "overview"}
        id="team-profile-panel-overview"
        labelledBy="team-profile-tab-overview"
      >
        {overview}
      </TabPanel>
      <TabPanel
        on={tab === "matches"}
        id="team-profile-panel-matches"
        labelledBy="team-profile-tab-matches"
      >
        {matches}
      </TabPanel>
      <TabPanel
        on={tab === "squad"}
        id="team-profile-panel-squad"
        labelledBy="team-profile-tab-squad"
      >
        {squad === null ? (
          <LiveLoadError />
        ) : (
          <>
            {picker && <div className="flex justify-end pt-4">{picker}</div>}
            <TeamSquadList
              players={squad.players}
              competitionId={competitionId}
            />
          </>
        )}
      </TabPanel>
      <TabPanel
        on={tab === "stats"}
        id="team-profile-panel-stats"
        labelledBy="team-profile-tab-stats"
      >
        {stats === null ? (
          <LiveLoadError />
        ) : (
          <TeamStatsPanel
            stats={stats.find((c) => c.competitionId === competitionId) ?? null}
            players={squad?.players ?? null}
            competitionId={competitionId}
            injuries={injuries}
            picker={picker}
          />
        )}
      </TabPanel>
    </>
  );
}

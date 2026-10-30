"use client";

import { useState, type ReactNode } from "react";
import {
  cleanSheetsIn,
  playerStatGroups,
  type PlayerCompetitionStats,
  type PlayerMatch,
} from "@plick/domain/player-profile";
import { PREMIER_LEAGUE_ID } from "@plick/domain/team-profile";
import { CompetitionPicker } from "@/_components/CompetitionPicker";
import { ProfileTabBar } from "@/_components/ProfileTabBar";
import { TabPanel } from "@/_components/TabPanel";
import { PLAYER_PROFILE_TABS } from "@/_constants/player-profile";
import type { PlayerProfileTabKey } from "@/_types/player-profile";
import { PlayerStatBox } from "./PlayerStatBox";
import { PlayerStatGroups } from "./PlayerStatGroups";

/**
 * 선수 프로필 숫자 상자, 탭 줄과 본문 (KAN-604, 시안 선수 프로필 모바일). 탭(개요, 기록,
 * 경기)과 대회 선택을 상태로 갖는다. 탭은 URL에 올리지 않아 열 때마다 개요로 시작한다.
 *
 * 대회 선택을 따르는 건 숫자 상자와 기록 묶음뿐이라 그 둘만 여기서 그린다. 개요, 경기 탭,
 * 시즌별 기록은 대회와 무관해 서버가 그린 노드로 받는다. 대회 선택은 KAN-597이 갈아 끼울
 * `CompetitionPicker` 자리이고 기본값은 프리미어리그다(웹 KAN-600과 같다).
 *
 * 골키퍼는 숫자 상자와 기록 묶음이 골키퍼 구성으로 바뀐다. 클린시트는 경기 기록에서 선택
 * 대회 경기만 센다.
 *
 * 탭 전환 이벤트(`screen_viewed`)는 보내지 않는다. 선수 프로필 화면 값이 BE 허용 목록에
 * 아직 없어 서버가 버린다.
 *
 * @param competitions 대회별 기록
 * @param isKeeper 골키퍼 구성
 * @param matches 경기 기록(클린시트 계산). null이면 불러오지 못한 것
 * @param overview 개요 탭 본문
 * @param matchesTab 경기 탭 본문
 * @param seasons 기록 탭 아래 시즌별 기록
 */
export function PlayerProfileView({
  competitions,
  isKeeper,
  matches,
  overview,
  matchesTab,
  seasons,
}: {
  competitions: PlayerCompetitionStats[];
  isKeeper: boolean;
  matches: PlayerMatch[] | null;
  overview: ReactNode;
  matchesTab: ReactNode;
  seasons: ReactNode;
}) {
  const options = competitions.map((c) => ({
    id: c.competitionId,
    name: c.competition,
  }));
  const [tab, setTab] = useState<PlayerProfileTabKey>("overview");
  const [competitionId, setCompetitionId] = useState(
    options.some((o) => o.id === PREMIER_LEAGUE_ID)
      ? PREMIER_LEAGUE_ID
      : (options[0]?.id ?? PREMIER_LEAGUE_ID),
  );
  const stats =
    competitions.find((c) => c.competitionId === competitionId) ?? null;
  const cleanSheets = cleanSheetsIn(matches, competitionId);

  return (
    <>
      {options.length > 1 && (
        <div className="flex justify-end pb-2">
          <CompetitionPicker
            options={options}
            value={competitionId}
            onChange={setCompetitionId}
          />
        </div>
      )}
      <PlayerStatBox
        stats={stats}
        isKeeper={isKeeper}
        cleanSheets={cleanSheets}
      />
      <div className="h-4" />
      <ProfileTabBar
        label="선수 프로필 보기"
        tabs={PLAYER_PROFILE_TABS}
        active={tab}
        onSelect={setTab}
        idPrefix="player-profile"
      />
      {/* 세 탭을 전부 그리고 비활성은 hidden (KAN-683). 기록·경기가 서버 HTML에 실린다 */}
      <TabPanel
        on={tab === "overview"}
        id="player-profile-panel-overview"
        labelledBy="player-profile-tab-overview"
      >
        {overview}
      </TabPanel>
      <TabPanel
        on={tab === "stats"}
        id="player-profile-panel-stats"
        labelledBy="player-profile-tab-stats"
      >
        {stats ? (
          <PlayerStatGroups
            groups={playerStatGroups(stats, isKeeper, cleanSheets)}
          />
        ) : (
          <p className="text-body text-text-4 py-6">기록이 없어요</p>
        )}
        {seasons}
      </TabPanel>
      <TabPanel
        on={tab === "matches"}
        id="player-profile-panel-matches"
        labelledBy="player-profile-tab-matches"
      >
        {matchesTab}
      </TabPanel>
    </>
  );
}

"use client";

import { useState, type ReactNode } from "react";
import {
  competitionOptions,
  PREMIER_LEAGUE_ID,
  type CompetitionOption,
  type TeamCompetitionStats,
  type TeamSquadMember,
} from "@plick/domain/team-profile";
import { TEAM_PROFILE_TABS } from "@/_constants/team-profile";
import type { TeamProfileTabKey } from "@/_types/team-profile";
import { LiveLoadError } from "@/live/_components/LiveLoadError";
import { CompetitionPicker } from "./CompetitionPicker";
import { TeamLeadersCard } from "./TeamLeadersCard";
import { TeamSquadTable } from "./TeamSquadTable";
import { TeamStatsPanel } from "./TeamStatsPanel";

/**
 * 팀 프로필 탭 줄과 본문, 우측 레일 (KAN-599, 시안 팀 프로필 1255-1480행). 탭(개요, 경기,
 * 선수단, 기록)과 대회 선택을 상태로 갖는다. 탭은 URL에 올리지 않아 프로필을 열 때마다
 * 개요로 시작한다.
 *
 * 개요, 경기 탭과 레일의 순위, 구단 정보, 부상자는 대회와 무관해 서버가 그린 노드로 받는다.
 * 선수단 표, 기록 탭, 팀 내 순위만 선택한 대회를 따라 여기서 그린다. 대회 선택 UI는
 * KAN-597이 갈아 끼울 자리라 `CompetitionPicker` 하나로 분리해 뒀고, 기본값은 프리미어리그다.
 *
 * 선수단이 비어 있으면 선수단 탭을 뺀다(시안과 같다). 못 받았으면(null) 탭은 두고 본문에
 * 다시 시도를 띄운다.
 *
 * @param overview 개요 탭 본문
 * @param matches 경기 탭 본문
 * @param squad 선수단과 그 대회 목록. null이면 불러오지 못한 것
 * @param stats 대회별 팀 기록. null이면 불러오지 못한 것
 * @param railTop 레일 맨 위(리그 순위)
 * @param railBottom 레일 아래(구단 정보, 부상자)
 */
export function TeamProfileView({
  overview,
  matches,
  squad,
  stats,
  railTop,
  railBottom,
}: {
  overview: ReactNode;
  matches: ReactNode;
  squad: {
    players: TeamSquadMember[];
    competitions: CompetitionOption[];
  } | null;
  stats: TeamCompetitionStats[] | null;
  railTop: ReactNode;
  railBottom: ReactNode;
}) {
  const options = competitionOptions(stats ?? [], squad?.competitions ?? []);
  const [tab, setTab] = useState<TeamProfileTabKey>("overview");
  const [competitionId, setCompetitionId] = useState(
    options.some((o) => o.id === PREMIER_LEAGUE_ID)
      ? PREMIER_LEAGUE_ID
      : (options[0]?.id ?? PREMIER_LEAGUE_ID),
  );

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
      <div
        role="tablist"
        aria-label="팀 프로필 보기"
        className="border-border mt-1.5 flex h-12 items-stretch gap-7 border-b"
      >
        {tabs.map(({ key, label }) => {
          const on = key === tab;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(key)}
              className={`text-tab focus-visible:outline-accent -mb-px border-b-2 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 ${
                on
                  ? "border-accent text-text-strong font-black"
                  : "text-text-3 hover:text-text-strong border-transparent font-bold"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-1 gap-10 pt-7 lg:grid-cols-[minmax(0,1fr)_18.75rem] lg:gap-11">
        <div role="tabpanel" className="flex min-w-0 flex-col gap-9.5">
          {tab === "overview" && overview}
          {tab === "matches" && matches}
          {tab === "squad" &&
            (squad === null ? (
              <LiveLoadError />
            ) : (
              <>
                {picker && <div className="flex justify-end">{picker}</div>}
                <TeamSquadTable
                  players={squad.players}
                  competitionId={competitionId}
                />
              </>
            ))}
          {tab === "stats" &&
            (stats === null ? (
              <LiveLoadError />
            ) : (
              <TeamStatsPanel
                stats={
                  stats.find((c) => c.competitionId === competitionId) ?? null
                }
                picker={picker}
              />
            ))}
        </div>
        <aside className="flex flex-col gap-3.5">
          {railTop}
          {squad && (
            <TeamLeadersCard
              players={squad.players}
              competitionId={competitionId}
            />
          )}
          {railBottom}
        </aside>
      </div>
    </>
  );
}

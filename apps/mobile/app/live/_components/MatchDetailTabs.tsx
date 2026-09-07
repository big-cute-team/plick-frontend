"use client";

import { useState } from "react";
import type { LiveTeam, MatchDetail } from "@plick/domain/live";
import { BenchList } from "./BenchList";
import { GoalsBlock } from "./GoalsBlock";
import { LineupPitch } from "./LineupPitch";
import { PlayerMatchStatsSheet } from "./PlayerMatchStatsSheet";
import { StatsCompare } from "./StatsCompare";
import { TimelineBlock } from "./TimelineBlock";

type TabKey = "summary" | "lineups" | "stats";

const TAB_LABEL: Record<TabKey, string> = {
  summary: "요약",
  lineups: "라인업",
  stats: "스탯",
};

/**
 * 경기 상세(라이브·종료)의 내부 탭(피그마 L6~L9). 목록 서브탭과 달리 URL로
 * 승격하지 않고 컴포넌트 상태로 둔다(ADR 0126 스토리 2 — 한 경기 안의 보기
 * 전환일 뿐이라 주소가 갈릴 이유가 없다). 각 블록은 서버가 조각 실패 시
 * null로 내릴 수 있어 블록별 빈 안내가 기본이다.
 *
 * 선수를 누르면 경기 스탯 시트가 열린다. 스탯 응답엔 팀명이 없어 눌린 자리의
 * 팀을 같이 들고 간다.
 */
export function MatchDetailTabs({ detail }: { detail: MatchDetail }) {
  const [tab, setTab] = useState<TabKey>("summary");
  const [player, setPlayer] = useState<{ id: number; team: LiveTeam } | null>(
    null,
  );
  const onPlayerTap = (id: number, team: LiveTeam) => setPlayer({ id, team });

  return (
    <>
      <div
        role="tablist"
        aria-label="경기 상세 보기"
        className="border-border flex border-b"
      >
        {(Object.keys(TAB_LABEL) as TabKey[]).map((key) => {
          const on = key === tab;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(key)}
              className={`text-body flex-1 border-b-2 pt-2 pb-2.5 font-bold ${
                on
                  ? "border-accent text-accent"
                  : "text-text-4 border-transparent"
              }`}
            >
              {TAB_LABEL[key]}
            </button>
          );
        })}
      </div>
      <div className="px-edge flex flex-col gap-3 pt-4 pb-6">
        {tab === "summary" &&
          (detail.events ? (
            <>
              <GoalsBlock header={detail.header} goals={detail.goals} />
              <TimelineBlock header={detail.header} events={detail.events} />
              <Caption status={detail.header.status} />
            </>
          ) : (
            <EmptyBlock label="요약 정보가 아직 없어요" />
          ))}
        {tab === "lineups" &&
          (detail.lineups ? (
            <>
              <LineupPitch
                home={detail.lineups.home}
                away={detail.lineups.away}
                onPlayerTap={onPlayerTap}
              />
              <BenchList
                lineup={detail.lineups.home}
                onPlayerTap={onPlayerTap}
              />
              <BenchList
                lineup={detail.lineups.away}
                onPlayerTap={onPlayerTap}
              />
            </>
          ) : (
            <EmptyBlock label="라인업은 킥오프 20~40분 전에 공개돼요" />
          ))}
        {tab === "stats" &&
          (detail.stats ? (
            <>
              <StatsCompare stats={detail.stats} />
              <Caption status={detail.header.status} />
            </>
          ) : (
            <EmptyBlock label="스탯 정보가 아직 없어요" />
          ))}
      </div>
      <PlayerMatchStatsSheet
        matchId={detail.header.id}
        live={detail.header.status === "LIVE"}
        player={player}
        onClose={() => setPlayer(null)}
      />
    </>
  );
}

/** 라이브 중에만 폴링 안내를, 종료 후엔 확정 안내를 단다(피그마 L6·L9). */
function Caption({ status }: { status: MatchDetail["header"]["status"] }) {
  return (
    <p className="text-caption text-text-4 text-center">
      {status === "LIVE"
        ? "라이브 중에는 20초마다 자동 갱신돼요"
        : "경기가 끝났어요 · 선수 평점은 확정 값이에요"}
    </p>
  );
}

function EmptyBlock({ label }: { label: string }) {
  return <p className="text-body text-text-4 py-16 text-center">{label}</p>;
}

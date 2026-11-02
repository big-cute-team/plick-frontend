"use client";

import { useState } from "react";
import type { LiveTeam, MatchDetail, StandingRow } from "@plick/domain/live";
import type { KeyPlayers, PredictionSummary } from "@plick/domain/prediction";
import { matchEmptyLabel } from "@/_constants/live";
import type { MatchTabKey } from "@/_types/live";
import { BenchList } from "./BenchList";
import { GoalsBlock } from "./GoalsBlock";
import { LineupPitch } from "./LineupPitch";
import { MatchNewsBlock } from "./MatchNewsBlock";
import { PlayerMatchStatsSheet } from "./PlayerMatchStatsSheet";
import { PlayerStatsTable } from "./PlayerStatsTable";
import { PredictionTab } from "./PredictionTab";
import { PreviewTab } from "./PreviewTab";
import { StandingsTable } from "./StandingsTable";
import { StatsCompare } from "./StatsCompare";
import { TimelineBlock } from "./TimelineBlock";

/**
 * 경기 상세 탭의 본문(피그마 L5~L9, 시안 KAN-567). 프리뷰·요약·라인업·스탯·순위·
 * 뉴스를 그린다. 채팅 탭은 스크롤 영역 밖에 따로 서야 해서(`LiveChatPanel`)
 * 여기 없다. 탭 선택은 `MatchDetailScreen`이 갖고 여기는 받은 탭만 그린다(KAN-458
 * 에서 제어형으로). 각 블록은 서버가 조각 실패 시 null로 내릴 수 있어 블록별
 * 빈 안내가 기본이다.
 *
 * 시안은 탭 본문을 카드 없이 선으로만 나눈 평면이라 전의 채운 면 카드 묶음을
 * 걷어냈다. 좌우 패딩은 블록마다 `px-edge`를 갖는다.
 *
 * 선수를 누르면 경기 스탯 시트가 열린다. 스탯 응답엔 팀명이 없어 눌린 자리의
 * 팀을 같이 들고 간다. 라인업 탭은 피치, 선수별 스탯 표, 벤치 순이다.
 *
 * 빈 자리 문구는 경기 상태를 본다 (KAN-484). 끝난 경기에 라인업이 안 실려 와도
 * 킥오프를 기다리라고 말하지 않게 `matchEmptyLabel`이 갈라 준다.
 *
 * 예측 탭(KAN-696)은 요약이 있을 때만 탭 목록에 들어오므로 여기서는 받은 요약을 그대로 그린다.
 * 프리뷰 탭(KAN-699)은 팀 비교와 키플레이어, 승부예측 묶음을 더해 `PreviewTab`이 통째로 그린다.
 *
 * @param detail 경기 상세
 * @param tab 지금 탭. `chat`은 오지 않는다
 * @param standings 순위 탭의 순위표. 서버가 못 받았으면 null이라 문구만 둔다
 * @param prediction 예측 요약. 예측 탭이 없는 경기는 null
 * @param keyPlayers 서버가 받아 둔 키플레이어 씨앗(프리뷰 탭). null은 예측 없는 경기, undefined는 서버가 못 받은 것
 * @param onSelectTab 탭을 바꿀 때. 프리뷰의 승부예측 묶음이 예측 탭으로 보낸다
 */
export function MatchDetailTabs({
  detail,
  tab,
  standings,
  prediction,
  keyPlayers,
  onSelectTab,
}: {
  detail: MatchDetail;
  tab: Exclude<MatchTabKey, "chat">;
  standings: StandingRow[] | null;
  prediction: PredictionSummary | null;
  keyPlayers: KeyPlayers | null | undefined;
  onSelectTab: (tab: MatchTabKey) => void;
}) {
  const [player, setPlayer] = useState<{ id: number; team: LiveTeam } | null>(
    null,
  );
  const onPlayerTap = (id: number, team: LiveTeam) => setPlayer({ id, team });

  if (tab === "prediction") {
    return prediction ? (
      <PredictionTab header={detail.header} summary={prediction} />
    ) : (
      <EmptyBlock label="예측할 수 없는 경기예요" />
    );
  }

  if (tab === "preview") {
    return (
      <PreviewTab
        detail={detail}
        summary={prediction}
        keyPlayers={keyPlayers}
        onSelectTab={onSelectTab}
      />
    );
  }

  if (tab === "table") {
    return standings ? (
      <div className="px-edge pt-3.5 pb-6">
        <StandingsTable
          rows={standings}
          showDraw
          highlight={[
            detail.header.home.shortName,
            detail.header.away.shortName,
          ]}
        />
      </div>
    ) : (
      <EmptyBlock label="순위표를 불러오지 못했어요" />
    );
  }

  if (tab === "news") {
    /* 목록 행(`NewsItem`)은 좌우 패딩을 부모에서 받는다. 홈 소식 리스트와 같다 */
    return (
      <div className="px-edge pt-1 pb-6">
        <MatchNewsBlock header={detail.header} />
      </div>
    );
  }

  return (
    <>
      <div className="px-edge pb-6">
        {tab === "summary" &&
          (detail.events ? (
            <>
              <GoalsBlock header={detail.header} goals={detail.goals} />
              <TimelineBlock header={detail.header} events={detail.events} />
            </>
          ) : (
            <EmptyBlock
              label={matchEmptyLabel("summary", detail.header.status)}
            />
          ))}
        {tab === "lineups" &&
          (detail.lineups ? (
            <>
              <LineupPitch
                home={detail.lineups.home}
                away={detail.lineups.away}
                onPlayerTap={onPlayerTap}
              />
              <PlayerStatsTable
                lineups={detail.lineups}
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
            <EmptyBlock
              label={matchEmptyLabel("lineups", detail.header.status)}
            />
          ))}
        {tab === "stats" &&
          (detail.stats ? (
            <StatsCompare stats={detail.stats} />
          ) : (
            <EmptyBlock
              label={matchEmptyLabel("stats", detail.header.status)}
            />
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

function EmptyBlock({ label }: { label: string }) {
  return <p className="text-body text-text-4 py-16 text-center">{label}</p>;
}

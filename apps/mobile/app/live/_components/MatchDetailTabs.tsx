"use client";

import { useState } from "react";
import type { LiveTeam, MatchDetail, StandingRow } from "@plick/domain/live";
import { matchEmptyLabel } from "@/_constants/live";
import type { MatchTabKey } from "@/_types/live";
import { BenchList } from "./BenchList";
import { GoalsBlock } from "./GoalsBlock";
import { LineupPitch } from "./LineupPitch";
import { MatchNewsBlock } from "./MatchNewsBlock";
import { PlayerMatchStatsSheet } from "./PlayerMatchStatsSheet";
import { PlayerStatsTable } from "./PlayerStatsTable";
import { PreviewBlocks } from "./PreviewBlocks";
import { StandingsTable } from "./StandingsTable";
import { StatsCompare } from "./StatsCompare";
import { TimelineBlock } from "./TimelineBlock";

/**
 * 경기 상세 탭의 본문(피그마 L5~L9, 시안 KAN-567). 프리뷰·요약·라인업·스탯·순위·
 * 뉴스를 그린다. 채팅 탭은 스크롤 영역 밖에 따로 서야 해서(`MatchChatPanel`)
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
 * @param detail 경기 상세
 * @param tab 지금 탭. `chat`은 오지 않는다
 * @param standings 순위 탭의 순위표. 서버가 못 받았으면 null이라 문구만 둔다
 */
export function MatchDetailTabs({
  detail,
  tab,
  standings,
}: {
  detail: MatchDetail;
  tab: Exclude<MatchTabKey, "chat">;
  standings: StandingRow[] | null;
}) {
  const [player, setPlayer] = useState<{ id: number; team: LiveTeam } | null>(
    null,
  );
  const onPlayerTap = (id: number, team: LiveTeam) => setPlayer({ id, team });

  if (tab === "preview") {
    return detail.preview ? (
      <PreviewBlocks preview={detail.preview} />
    ) : (
      <EmptyBlock label="프리뷰 정보가 아직 없어요" />
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

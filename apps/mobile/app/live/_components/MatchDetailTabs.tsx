"use client";

import { useState } from "react";
import type { LiveTeam, MatchDetail } from "@plick/domain/live";
import type { MatchTabKey } from "@/_types/live";
import { BenchList } from "./BenchList";
import { GoalsBlock } from "./GoalsBlock";
import { LineupPitch } from "./LineupPitch";
import { PlayerMatchStatsSheet } from "./PlayerMatchStatsSheet";
import { PreviewBlocks } from "./PreviewBlocks";
import { StatsCompare } from "./StatsCompare";
import { TimelineBlock } from "./TimelineBlock";

/**
 * 경기 상세 탭의 본문(피그마 L5~L9). 프리뷰·요약·라인업·스탯을 그린다. 채팅 탭은
 * 스크롤 영역 밖에 따로 서야 해서(`MatchChatPanel`) 여기 없다. 탭 선택은
 * `MatchDetailScreen`이 갖고 여기는 받은 탭만 그린다(KAN-458에서 제어형으로).
 * 각 블록은 서버가 조각 실패 시 null로 내릴 수 있어 블록별 빈 안내가 기본이다.
 *
 * 선수를 누르면 경기 스탯 시트가 열린다. 스탯 응답엔 팀명이 없어 눌린 자리의
 * 팀을 같이 들고 간다.
 *
 * @param detail 경기 상세
 * @param tab 지금 탭. `chat`은 오지 않는다
 */
export function MatchDetailTabs({
  detail,
  tab,
}: {
  detail: MatchDetail;
  tab: Exclude<MatchTabKey, "chat">;
}) {
  const [player, setPlayer] = useState<{ id: number; team: LiveTeam } | null>(
    null,
  );
  const onPlayerTap = (id: number, team: LiveTeam) => setPlayer({ id, team });

  if (tab === "preview") {
    return detail.preview ? (
      <div className="pt-4">
        <PreviewBlocks preview={detail.preview} />
      </div>
    ) : (
      <EmptyBlock label="프리뷰 정보가 아직 없어요" />
    );
  }

  return (
    <>
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

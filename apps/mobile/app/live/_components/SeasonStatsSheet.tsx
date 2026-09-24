"use client";

import {
  LIVE_SEASON_LABEL,
  POSITION_LABEL,
  ratingTone,
} from "@plick/domain/live";
import type { LiveTeam, SquadPlayer } from "@plick/domain/live";
import { PlayerPhoto } from "@plick/ui/PlayerPhoto";
import { QueryBoundary } from "@/_components/QueryBoundary";
import { usePlayerSeasonStats } from "@/_hooks/usePlayerSeasonStats";
import { LiveSheet } from "./LiveSheet";

/** 대회별 표의 열. 대회명, 출전 32, 골 24, 도움 32, 평점 36 */
const COLS = "grid-cols-[minmax(0,1fr)_32px_24px_32px_36px]";

/**
 * 선수 시즌 스탯 바텀시트(피그마 L12·L13, KAN-567 톤). 팀 프로필 선수단에서
 * 선수를 누르면 열리고 열릴 때만 GET /players/{id}/season-stats를 부른다. 응답엔
 * 이름·포지션이 없어 헤더는 눌린 스쿼드 행에서 받는다. 무출전은 404가 아니라
 * `competitions: []`라 빈 상태 지면을 따로 그린다(명세 규약).
 *
 * 표는 순위표와 같은 어법이다. 머리 28px(10.5 회색, 표 선), 행 36px(행 선),
 * 평점 12.5/900은 7.5 이상 강조색이다.
 *
 * @param player 열려는 스쿼드 선수 (null이면 닫힘)
 * @param team 스쿼드의 팀 (헤더 표기용)
 */
export function SeasonStatsSheet({
  player,
  team,
  onClose,
}: {
  player: SquadPlayer | null;
  team: LiveTeam;
  onClose: () => void;
}) {
  return (
    <LiveSheet open={player !== null} onClose={onClose} label="선수 시즌 스탯">
      {player && (
        <>
          <div className="flex items-center gap-3 pb-4">
            <PlayerPhoto src={player.photo} name={player.name} size={48} />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-title text-text-strong tracking-heading font-black">
                {player.name}
              </span>
              <span className="text-caption-lg text-text-3">
                {team.name}, {POSITION_LABEL[player.position]},{" "}
                {LIVE_SEASON_LABEL} 시즌
              </span>
            </span>
          </div>
          <QueryBoundary
            name="SeasonStats"
            fallback={<TableSkeleton />}
            errorMessage="시즌 스탯을 불러오지 못했어요"
          >
            <SeasonStatsTable playerId={player.id} />
          </QueryBoundary>
        </>
      )}
    </LiveSheet>
  );
}

function SeasonStatsTable({ playerId }: { playerId: number }) {
  const { data: stats } = usePlayerSeasonStats(playerId);

  if (stats.competitions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1.5 py-8 text-center">
        <p className="text-body-lg text-text-strong font-black">
          이번 시즌 출전 기록이 없어요
        </p>
        <p className="text-caption-lg text-text-3">
          경기에 출전하면 대회별 기록이 여기에 쌓여요
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className={`border-border-table text-micro-lg text-text-4 grid h-7 items-center gap-1.5 border-b ${COLS}`}
      >
        <span>대회</span>
        <span className="text-center">출전</span>
        <span className="text-center">골</span>
        <span className="text-center">도움</span>
        <span className="text-center">평점</span>
      </div>
      {stats.competitions.map((competition, i) => (
        <div
          key={`${competition.name}-${i}`}
          className={`border-border-soft grid h-9 items-center gap-1.5 border-b ${COLS}`}
        >
          <span className="text-body text-text-strong min-w-0 truncate font-bold">
            {competition.name}
          </span>
          <span className="text-caption-lg text-text-3 text-center">
            {competition.appearances ?? "-"}
          </span>
          <span className="text-caption-lg text-text-3 text-center">
            {competition.goals ?? "-"}
          </span>
          <span className="text-caption-lg text-text-3 text-center">
            {competition.assists ?? "-"}
          </span>
          <span
            className={`text-label-lg text-center font-black ${
              ratingTone(competition.rating) === "accent"
                ? "text-accent"
                : competition.rating === null
                  ? "text-text-4"
                  : "text-warn"
            }`}
          >
            {competition.rating === null ? "-" : competition.rating.toFixed(2)}
          </span>
        </div>
      ))}
    </>
  );
}

/** 표 자리 스켈레톤. 행 세 줄의 실루엣. */
function TableSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-3 py-2">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="bg-elevate rounded-badge h-5" />
      ))}
    </div>
  );
}

"use client";

import {
  LIVE_SEASON_LABEL,
  POSITION_LABEL,
  ratingTone,
} from "@plick/domain/live";
import type { LiveTeam, SquadPlayer } from "@plick/domain/live";
import { usePlayerSeasonStats } from "@/_hooks/usePlayerSeasonStats";
import { LiveModal } from "./LiveModal";
import { RetryMessage } from "./PlayerMatchStatsModal";

/**
 * 선수 시즌 스탯 다이얼로그 (KAN-567 톤 정리) — 팀 프로필 선수단에서 선수를 누르면
 * 열리고 열려 있을 때만 GET /players/{id}/season-stats를 부른다. 응답엔 이름, 포지션이
 * 없어 머리는 눌린 선수단 행에서 받는다. 무출전은 `competitions: []`라 빈 상태를
 * 따로 그린다(명세 규약). 대회별 표는 시안의 표 규칙(머리 10.5 보조색, 표 테두리)이다.
 *
 * @param player 열려는 선수단 선수 (null이면 닫힘)
 * @param team 선수단의 팀 (머리 표기용)
 */
export function SeasonStatsModal({
  player,
  team,
  onClose,
}: {
  player: SquadPlayer | null;
  team: LiveTeam;
  onClose: () => void;
}) {
  const {
    data: stats,
    isPending,
    isError,
    refetch,
  } = usePlayerSeasonStats(player?.id ?? null);

  return (
    <LiveModal open={player !== null} onClose={onClose} label="선수 시즌 스탯">
      {player && (
        <div className="flex flex-col gap-0.5 pr-6 pb-4">
          <span className="text-title text-text-strong tracking-heading font-black">
            {player.name}
          </span>
          <span className="text-label text-text-3">
            {team.name}, {POSITION_LABEL[player.position]}, {LIVE_SEASON_LABEL}
          </span>
        </div>
      )}
      {isPending ? (
        <div className="flex animate-pulse flex-col gap-2 py-2">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="bg-chip h-5" />
          ))}
        </div>
      ) : isError ? (
        <RetryMessage
          message="시즌 스탯을 불러오지 못했어요"
          onRetry={() => refetch()}
        />
      ) : stats.competitions.length > 0 ? (
        <>
          <div className="border-border-table text-micro-lg text-text-4 flex h-7 items-center gap-2 border-b">
            <span className="min-w-0 flex-1">대회</span>
            <span className="w-8 text-right">출전</span>
            <span className="w-6 text-right">골</span>
            <span className="w-8 text-right">도움</span>
            <span className="w-10 text-right">평점</span>
          </div>
          {stats.competitions.map((competition, i) => (
            <div
              key={`${competition.name}-${i}`}
              className="border-border-soft flex h-9 items-center gap-2 border-b"
            >
              <span className="text-body text-text-strong min-w-0 flex-1 truncate font-bold">
                {competition.name}
              </span>
              <span className="text-label text-text-3 w-8 text-right">
                {competition.appearances ?? "-"}
              </span>
              <span className="text-label text-text-3 w-6 text-right">
                {competition.goals ?? "-"}
              </span>
              <span className="text-label text-text-3 w-8 text-right">
                {competition.assists ?? "-"}
              </span>
              <span
                className={`text-label-lg w-10 text-right font-black ${
                  ratingTone(competition.rating) === "accent"
                    ? "text-accent"
                    : "text-text-strong"
                }`}
              >
                {competition.rating === null
                  ? "-"
                  : competition.rating.toFixed(2)}
              </span>
            </div>
          ))}
        </>
      ) : (
        <p className="text-body-md text-text-4 py-8">
          이번 시즌 출전 기록이 없어요
        </p>
      )}
    </LiveModal>
  );
}

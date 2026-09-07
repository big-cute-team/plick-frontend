"use client";

import { POSITION_LABEL, ratingTone } from "@plick/domain/live";
import type { LiveTeam } from "@plick/domain/live";
import { QueryBoundary } from "@/_components/QueryBoundary";
import { usePlayerMatchStats } from "@/_hooks/usePlayerMatchStats";
import { LiveSheet } from "./LiveSheet";
import { PlayerPhoto } from "./PlayerPhoto";

/**
 * 선수 경기 스탯 바텀시트(피그마 L10). 라인업·벤치에서 선수를 누르면 열리고,
 * 열릴 때만 GET /matches/{id}/players/{pid}를 부른다 — 본문이 시트가 열릴 때
 * 마운트되는 suspense 쿼리라 `enabled` 스위치가 필요 없다(ADR 0126).
 *
 * @param matchId - 경기 id
 * @param live - 라이브 중이면 열 때마다 다시 받는다(평점이 움직인다)
 * @param player - 열려는 선수와 소속 팀 (null이면 닫힘). 팀명은 응답에 없어 여기서 받는다
 */
export function PlayerMatchStatsSheet({
  matchId,
  live,
  player,
  onClose,
}: {
  matchId: number;
  live: boolean;
  player: { id: number; team: LiveTeam } | null;
  onClose: () => void;
}) {
  return (
    <LiveSheet open={player !== null} onClose={onClose} label="선수 경기 스탯">
      {player && (
        <QueryBoundary
          fallback={<SheetSkeleton />}
          errorMessage="선수 스탯을 불러오지 못했어요."
        >
          <PlayerMatchStatsBody
            matchId={matchId}
            live={live}
            playerId={player.id}
            team={player.team}
          />
        </QueryBoundary>
      )}
    </LiveSheet>
  );
}

function PlayerMatchStatsBody({
  matchId,
  live,
  playerId,
  team,
}: {
  matchId: number;
  live: boolean;
  playerId: number;
  team: LiveTeam;
}) {
  const { data: stats } = usePlayerMatchStats(matchId, playerId, live);
  const tone = ratingTone(stats.rating);

  return (
    <>
      <div className="flex items-center gap-3 pb-4">
        <PlayerPhoto src={stats.photo} name={stats.name} size={48} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-title text-text font-extrabold">
            {stats.name}
            {stats.captain && (
              <span className="text-caption text-accent ml-1.5 font-bold">
                C
              </span>
            )}
          </span>
          <span className="text-caption text-text-3">
            {team.name} · {POSITION_LABEL[stats.position]}
            {stats.number !== null && ` · No.${stats.number}`}
            {stats.minutes === null
              ? " · 무출전"
              : ` · ${stats.minutes}분 출전${stats.substitute ? " (교체)" : ""}`}
          </span>
        </span>
        {stats.rating !== null && (
          <span
            className={`rounded-tile text-body-lg px-2.5 py-1 font-extrabold ${
              tone === "accent"
                ? "bg-accent-tint text-accent"
                : "bg-warn-tint text-warn"
            }`}
          >
            {stats.rating.toFixed(1)}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {stats.stats.map((entry) => (
          <div
            key={entry.label}
            className="bg-elevate rounded-tile flex flex-col gap-1 px-3.5 py-3"
          >
            <span className="text-caption text-text-4">{entry.label}</span>
            <span className="text-body-lg text-text font-bold">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

/** 시트 본문 스켈레톤 — 헤더 한 줄과 스탯 타일 여섯 개의 실루엣. */
function SheetSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center gap-3 pb-4">
        <div className="bg-avatar size-12 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <div className="bg-elevate rounded-control h-5 w-1/2" />
          <div className="bg-elevate rounded-control h-3.5 w-2/3" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="bg-elevate rounded-tile h-16" />
        ))}
      </div>
    </div>
  );
}

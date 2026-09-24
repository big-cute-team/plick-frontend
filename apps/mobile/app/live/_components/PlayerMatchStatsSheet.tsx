"use client";

import { POSITION_LABEL, ratingTone } from "@plick/domain/live";
import type { LiveTeam } from "@plick/domain/live";
import { PlayerPhoto } from "@plick/ui/PlayerPhoto";
import { QueryBoundary } from "@/_components/QueryBoundary";
import { usePlayerMatchStats } from "@/_hooks/usePlayerMatchStats";
import { LiveSheet } from "./LiveSheet";

/**
 * 선수 경기 스탯 바텀시트(피그마 L10, KAN-567 톤). 라인업·선수별 스탯 표·벤치에서
 * 선수를 누르면 열리고, 열릴 때만 GET /matches/{id}/players/{pid}를 부른다.
 * 본문이 시트가 열릴 때 마운트되는 suspense 쿼리라 `enabled` 스위치가 필요 없다
 * (ADR 0126). 머리는 사진 48, 이름 17/900, 메타 11.5 보조색, 오른쪽 평점 칩
 * (7.5 이상 강조색, 미만 warn)이고 아래는 스탯 타일 두 열이다.
 *
 * @param matchId 경기 id
 * @param live 라이브 중이면 열 때마다 다시 받는다(평점이 움직인다)
 * @param player 열려는 선수와 소속 팀 (null이면 닫힘). 팀명은 응답에 없어 여기서 받는다
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
          name="PlayerMatchStats"
          fallback={<SheetSkeleton />}
          errorMessage="선수 스탯을 불러오지 못했어요"
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
  const meta = [
    team.name,
    POSITION_LABEL[stats.position],
    stats.number !== null ? `No.${stats.number}` : null,
    stats.minutes === null
      ? "무출전"
      : `${stats.minutes}분 출전${stats.substitute ? " (교체)" : ""}`,
  ].filter(Boolean);

  return (
    <>
      <div className="flex items-center gap-3 pb-4">
        <PlayerPhoto src={stats.photo} name={stats.name} size={48} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-title text-text-strong tracking-heading font-black">
            {stats.name}
            {stats.captain && (
              <span className="text-caption text-accent ml-1.5 font-bold">
                C
              </span>
            )}
          </span>
          <span className="text-caption-lg text-text-3">{meta.join(", ")}</span>
        </span>
        {stats.rating !== null && (
          <span
            className={`bg-chip rounded-badge text-body-lg px-2.5 py-1 font-black ${
              tone === "accent" ? "text-accent" : "text-warn"
            }`}
          >
            {stats.rating.toFixed(1)}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {stats.stats.map((entry) => (
          <div
            key={entry.label}
            className="bg-elevate-2 rounded-tile flex flex-col gap-1 px-3.5 py-3"
          >
            <span className="text-caption text-text-4">{entry.label}</span>
            <span className="text-body-lg text-text-strong font-black">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

/** 시트 본문 스켈레톤. 헤더 한 줄과 스탯 타일 여섯 개의 실루엣. */
function SheetSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center gap-3 pb-4">
        <div className="bg-avatar size-12 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <div className="bg-elevate rounded-badge h-5 w-1/2" />
          <div className="bg-elevate rounded-badge h-3.5 w-2/3" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="bg-elevate-2 rounded-tile h-16" />
        ))}
      </div>
    </div>
  );
}

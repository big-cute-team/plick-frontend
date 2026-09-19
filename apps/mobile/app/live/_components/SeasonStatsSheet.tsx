"use client";

import {
  LIVE_SEASON_LABEL,
  POSITION_LABEL,
  ratingTone,
} from "@plick/domain/live";
import type { LiveTeam, SquadPlayer } from "@plick/domain/live";
import { QueryBoundary } from "@/_components/QueryBoundary";
import { usePlayerSeasonStats } from "@/_hooks/usePlayerSeasonStats";
import { LiveSheet } from "./LiveSheet";
import { PlayerPhoto } from "./PlayerPhoto";

/**
 * 선수 시즌 스탯 바텀시트(피그마 L12·L13). 스쿼드에서 선수를 누르면 열리고
 * 열릴 때만 GET /players/{id}/season-stats를 부른다. 응답엔 이름·포지션이
 * 없어 헤더는 눌린 스쿼드 행에서 받는다. 무출전은 404가 아니라
 * `competitions: []`라 빈 상태 지면을 따로 그린다(명세 규약).
 *
 * @param player - 열려는 스쿼드 선수 (null이면 닫힘)
 * @param team - 스쿼드의 팀 (헤더 표기용)
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
            <span className="flex min-w-0 flex-col">
              <span className="text-title text-text font-extrabold">
                {player.name}
              </span>
              <span className="text-caption text-text-3">
                {team.name} · {POSITION_LABEL[player.position]} ·{" "}
                {LIVE_SEASON_LABEL}
              </span>
            </span>
          </div>
          <QueryBoundary
            name="SeasonStats"
            fallback={<TableSkeleton />}
            errorMessage="시즌 스탯을 불러오지 못했어요."
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
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <span className="bg-elevate text-text-4 grid size-12 place-items-center rounded-full text-xl font-bold">
          —
        </span>
        <p className="text-body-lg text-text font-bold">
          이번 시즌 출전 기록이 없어요
        </p>
        <p className="text-caption text-text-4">
          경기에 출전하면 대회별 기록이 여기에 쌓여요
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="text-caption text-text-4 flex items-center gap-2 pb-2 font-medium">
        <span className="min-w-0 flex-1">대회</span>
        <span className="w-8 text-right">출전</span>
        <span className="w-6 text-right">골</span>
        <span className="w-8 text-right">도움</span>
        <span className="w-9 text-right">평점</span>
      </div>
      {stats.competitions.map((competition, i) => (
        <div
          key={`${competition.name}-${i}`}
          className={`flex items-center gap-2 py-2.5 ${
            i > 0 ? "border-border border-t" : ""
          }`}
        >
          <span className="text-body text-text min-w-0 flex-1 truncate font-semibold">
            {competition.name}
          </span>
          <span className="text-label text-text-2 w-8 text-right">
            {competition.appearances ?? "-"}
          </span>
          <span className="text-label text-text-2 w-6 text-right">
            {competition.goals ?? "-"}
          </span>
          <span className="text-label text-text-2 w-8 text-right">
            {competition.assists ?? "-"}
          </span>
          <span
            className={`text-label w-9 text-right font-bold ${
              ratingTone(competition.rating) === "accent"
                ? "text-accent"
                : "text-text"
            }`}
          >
            {competition.rating === null ? "-" : competition.rating.toFixed(2)}
          </span>
        </div>
      ))}
      <p className="text-caption text-text-4 pt-3 text-center">
        시즌 누적 스탯이에요 · 하루 1번 갱신돼요
      </p>
    </>
  );
}

/** 표 자리 스켈레톤 — 행 세 줄의 실루엣. */
function TableSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-3 py-2">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="bg-elevate rounded-control h-5" />
      ))}
    </div>
  );
}

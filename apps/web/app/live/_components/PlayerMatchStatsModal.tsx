"use client";

import { MOCK_PLAYER_MATCH_STATS } from "@plick/domain/live-mock";
import { ratingTone } from "@plick/domain/live";
import { LiveModal } from "./LiveModal";

/**
 * 선수 경기 스탯 모달 — 모바일 L10 바텀시트의 데스크톱판. 라인업·벤치에서
 * 선수를 누르면 열린다. 실배선 때 열릴 때만 GET /matches/{id}/players/{pid}를
 * 부른다(`useQuery({ enabled: open })`, ADR 0126).
 */
export function PlayerMatchStatsModal({
  playerId,
  onClose,
}: {
  playerId: number | null;
  onClose: () => void;
}) {
  const stats = playerId === null ? null : MOCK_PLAYER_MATCH_STATS[playerId];

  return (
    <LiveModal
      open={playerId !== null}
      onClose={onClose}
      label="선수 경기 스탯"
    >
      {stats ? (
        <>
          <div className="flex items-center gap-3 pb-5">
            <span className="bg-avatar size-12 shrink-0 rounded-full" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-title text-text font-extrabold">
                {stats.name}
              </span>
              <span className="text-caption text-text-3">
                {stats.teamName} · {stats.position} · No.{stats.number} ·{" "}
                {stats.minutes}분 출전
              </span>
            </span>
            {stats.rating !== null && (
              <span
                className={`rounded-tile text-body-lg mr-8 px-2.5 py-1 font-extrabold ${
                  ratingTone(stats.rating) === "accent"
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
      ) : (
        <p className="text-body text-text-4 py-10 text-center">
          이 선수의 경기 스탯을 준비 중이에요
        </p>
      )}
    </LiveModal>
  );
}

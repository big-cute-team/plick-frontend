"use client";

import { POSITION_LABEL, ratingTone } from "@plick/domain/live";
import type { LiveTeam } from "@plick/domain/live";
import { usePlayerMatchStats } from "@/_hooks/usePlayerMatchStats";
import { LiveModal } from "./LiveModal";
import { PlayerPhoto } from "./PlayerPhoto";

/**
 * 선수 경기 스탯 모달 — 모바일 L10 바텀시트의 데스크톱판. 라인업·벤치에서
 * 선수를 누르면 열리고, 열려 있을 때만 GET /matches/{id}/players/{pid}를
 * 부른다(`enabled`, ADR 0126). 팀명은 응답에 없어 눌린 자리에서 받는다.
 *
 * @param player - 열려는 선수와 소속 팀 (null이면 닫힘)
 */
export function PlayerMatchStatsModal({
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
  const {
    data: stats,
    isPending,
    isError,
    refetch,
  } = usePlayerMatchStats(matchId, player?.id ?? null, live);

  return (
    <LiveModal open={player !== null} onClose={onClose} label="선수 경기 스탯">
      {isPending ? (
        <ModalSkeleton />
      ) : isError ? (
        <RetryMessage
          message="선수 스탯을 불러오지 못했어요."
          onRetry={() => refetch()}
        />
      ) : (
        <>
          <div className="flex items-center gap-3 pb-5">
            <PlayerPhoto src={stats.photo} name={stats.name} size={64} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-headline text-text font-extrabold">
                {stats.name}
                {stats.captain && (
                  <span className="text-caption text-accent ml-1.5 font-bold">
                    C
                  </span>
                )}
              </span>
              <span className="text-body text-text-3">
                {player?.team.name} · {POSITION_LABEL[stats.position]}
                {stats.number !== null && ` · No.${stats.number}`}
                {stats.minutes === null
                  ? " · 무출전"
                  : ` · ${stats.minutes}분 출전${stats.substitute ? " (교체)" : ""}`}
              </span>
            </span>
            {stats.rating !== null && (
              <span
                className={`rounded-tile text-title mr-8 px-3 py-1.5 font-extrabold ${
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
                className="bg-elevate rounded-tile flex flex-col gap-1 px-4 py-3.5"
              >
                <span className="text-body text-text-4">{entry.label}</span>
                <span className="text-title text-text font-bold">
                  {entry.value}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </LiveModal>
  );
}

/** 모달 본문 스켈레톤 — 헤더 한 줄과 스탯 타일 여섯 개의 실루엣. */
function ModalSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center gap-3 pb-5">
        <div className="bg-avatar size-16 rounded-full" />
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

/** 모달 안 에러 안내 + 다시 시도 — 토론 리스트의 에러 관용을 그대로 옮겼다. */
export function RetryMessage({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="py-10 text-center">
      <p className="text-body text-text-4">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="bg-elevate text-label text-text rounded-control hover:bg-elevate-2 mt-3 px-4 py-2 font-bold"
      >
        다시 시도
      </button>
    </div>
  );
}

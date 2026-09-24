"use client";

import { POSITION_LABEL, ratingTone } from "@plick/domain/live";
import type { LiveTeam } from "@plick/domain/live";
import { usePlayerMatchStats } from "@/_hooks/usePlayerMatchStats";
import { LiveModal } from "./LiveModal";

/**
 * 선수 경기 스탯 다이얼로그 — 모바일 L10 바텀시트의 데스크톱판 (KAN-567 톤 정리).
 * 라인업, 벤치에서 선수를 누르면 열리고, 열려 있을 때만 GET /matches/{id}/players/{pid}를
 * 부른다(`enabled`, ADR 0126). 팀명은 응답에 없어 눌린 자리에서 받는다. 선수 사진은
 * 시안 규칙(프로필 이미지 없음)대로 그리지 않는다.
 *
 * @param player 열려는 선수와 소속 팀 (null이면 닫힘)
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
          message="선수 스탯을 불러오지 못했어요"
          onRetry={() => refetch()}
        />
      ) : (
        <>
          <div className="flex items-start gap-3 pr-6 pb-4">
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-title text-text-strong tracking-heading font-black">
                {stats.name}
                {stats.captain && (
                  <span className="text-caption text-accent ml-1.5 font-bold">
                    C
                  </span>
                )}
              </span>
              <span className="text-label text-text-3">
                {player?.team.name}, {POSITION_LABEL[stats.position]}
                {stats.number !== null && `, ${stats.number}번`}
                {stats.minutes === null
                  ? ", 무출전"
                  : `, ${stats.minutes}분 출전${stats.substitute ? " (교체)" : ""}`}
              </span>
            </span>
            {stats.rating !== null && (
              <span
                className={`text-headline tracking-title font-black ${
                  ratingTone(stats.rating) === "accent"
                    ? "text-accent"
                    : "text-warn"
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
                className="bg-chip flex flex-col gap-0.5 px-3 py-2.5"
              >
                <span className="text-caption-lg text-text-3">
                  {entry.label}
                </span>
                <span className="text-body-md text-text-strong font-bold">
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

/** 다이얼로그 본문 스켈레톤 — 머리 두 줄과 스탯 타일 여섯 개의 실루엣. */
function ModalSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex flex-col gap-2 pb-4">
        <div className="bg-chip h-5 w-1/2" />
        <div className="bg-chip h-3.5 w-2/3" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="bg-chip h-14" />
        ))}
      </div>
    </div>
  );
}

/** 다이얼로그 안 에러 안내 + 다시 시도 텍스트 버튼. */
export function RetryMessage({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex items-baseline gap-3 py-8">
      <p className="text-body-md text-text-4">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="text-label-lg text-accent hover:text-accent-hover font-bold"
      >
        다시 시도
      </button>
    </div>
  );
}

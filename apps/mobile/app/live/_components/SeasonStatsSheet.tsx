"use client";

import { MOCK_PLAYER_SEASON_STATS } from "@plick/domain/live-mock";
import { ratingTone } from "@plick/domain/live";
import { LiveSheet } from "./LiveSheet";

/**
 * 선수 시즌 스탯 바텀시트(피그마 L12·L13). 스쿼드에서 선수를 누르면 열린다.
 * 무출전은 404가 아니라 `competitions: []`라 빈 상태 지면을 따로 그린다
 * (명세 규약). 실배선 때 열릴 때만 GET /players/{id}/season-stats를 부른다.
 */
export function SeasonStatsSheet({
  playerId,
  onClose,
}: {
  playerId: number | null;
  onClose: () => void;
}) {
  const stats = playerId === null ? null : MOCK_PLAYER_SEASON_STATS[playerId];

  return (
    <LiveSheet
      open={playerId !== null}
      onClose={onClose}
      label="선수 시즌 스탯"
    >
      {stats ? (
        <>
          <div className="flex items-center gap-3 pb-4">
            <span className="bg-avatar size-12 shrink-0 rounded-full" />
            <span className="flex min-w-0 flex-col">
              <span className="text-title text-text font-extrabold">
                {stats.name}
              </span>
              <span className="text-caption text-text-3">
                {stats.teamName} · {stats.position} · {stats.season}
              </span>
            </span>
          </div>
          {stats.competitions.length > 0 ? (
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
                  key={competition.name}
                  className={`flex items-center gap-2 py-2.5 ${
                    i > 0 ? "border-border border-t" : ""
                  }`}
                >
                  <span className="text-body text-text min-w-0 flex-1 truncate font-semibold">
                    {competition.name}
                  </span>
                  <span className="text-label text-text-2 w-8 text-right">
                    {competition.appearances}
                  </span>
                  <span className="text-label text-text-2 w-6 text-right">
                    {competition.goals}
                  </span>
                  <span className="text-label text-text-2 w-8 text-right">
                    {competition.assists}
                  </span>
                  <span
                    className={`text-label w-9 text-right font-bold ${
                      ratingTone(competition.rating) === "accent"
                        ? "text-accent"
                        : "text-text"
                    }`}
                  >
                    {competition.rating.toFixed(2)}
                  </span>
                </div>
              ))}
              <p className="text-caption text-text-4 pt-3 text-center">
                시즌 누적 스탯이에요 · 하루 1번 갱신돼요
              </p>
            </>
          ) : (
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
          )}
        </>
      ) : (
        <p className="text-body text-text-4 py-10 text-center">
          이 선수의 시즌 스탯을 준비 중이에요
        </p>
      )}
    </LiveSheet>
  );
}

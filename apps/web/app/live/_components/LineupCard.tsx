"use client";

import { useState } from "react";
import { TEAMS } from "@plick/domain/constants";
import {
  lineupPitchLines,
  ratingTone,
  type LineupPlayer,
  type LiveTeam,
  type TeamLineup,
} from "@plick/domain/live";
import { PlayerMatchStatsModal } from "./PlayerMatchStatsModal";

/**
 * 라인업 탭 (KAN-462 → KAN-567 시안 경기 상세 922-970행). 팀명 13.5/700 + 포메이션 12
 * 줄 아래 짙은 초록 피치(`bg-pitch`, 각진, 위아래 20px 좌우 16px, 최소 280px)에 선수를
 * 줄 단위로 깐다. 선수는 등번호 원 26(11/900) + 이름 10/700 흰색 + 평점 9.5/900이다.
 * `grid`는 "줄:칸"(GK가 1줄), 원정 위, 홈 아래 반전(명세 규약)이고 칸 좌우는
 * `lineupPitchLines`가 팀 방향에 맞춰 정한다(KAN-551). 선수를 누르면 경기 스탯
 * 모달이 열린다. 그 상태 때문에 클라 컴포넌트다. 스탯 응답엔 팀명이 없어 눌린
 * 자리의 팀을 같이 들고 간다.
 *
 * 시안의 "선수별 스탯" 표(출전, 슈팅, 패스, 평점)는 선수 전원의 경기 스탯을 한 번에
 * 주는 API가 없어 벤치 표로 대신한다(번호, 선수, 팀, 포지션, 평점).
 *
 * @param matchId 경기 id (선수 스탯 조회용)
 * @param live 라이브 중이면 모달을 열 때마다 스탯을 다시 받는다
 */
export function LineupCard({
  matchId,
  live,
  home,
  away,
}: {
  matchId: number;
  live: boolean;
  home: TeamLineup;
  away: TeamLineup;
}) {
  const [player, setPlayer] = useState<{ id: number; team: LiveTeam } | null>(
    null,
  );
  const onPlayerTap = (id: number, team: LiveTeam) => setPlayer({ id, team });

  return (
    <div>
      <div className="flex items-baseline gap-3 pt-4.5 pb-3">
        <span className="text-body text-text-strong font-bold">
          {home.team.name}
        </span>
        <span className="text-label text-text-3">{home.formation}</span>
        <span className="flex-1" />
        <span className="text-label text-text-3">{away.formation}</span>
        <span className="text-body text-text-strong font-bold">
          {away.team.name}
        </span>
      </div>

      <div className="bg-pitch relative overflow-hidden px-4 py-5">
        <div
          aria-hidden
          className="border-media-chip-border absolute top-0 bottom-0 left-1/2 w-px border-l"
        />
        <div
          aria-hidden
          className="border-media-chip-border absolute top-1/2 left-1/2 size-21.5 -translate-x-1/2 -translate-y-1/2 rounded-full border"
        />
        <div className="relative flex min-h-70 flex-col justify-between gap-5">
          {lineupPitchLines(away.players, "down").map((line, i) => (
            <PitchLine
              key={`away-${i}`}
              lineup={away}
              players={line}
              onPlayerTap={onPlayerTap}
            />
          ))}
          {lineupPitchLines(home.players, "up")
            .reverse()
            .map((line, i) => (
              <PitchLine
                key={`home-${i}`}
                lineup={home}
                players={line}
                onPlayerTap={onPlayerTap}
              />
            ))}
        </div>
      </div>

      {(home.bench.length > 0 || away.bench.length > 0) && (
        <>
          <p className="text-body-md text-text-strong pt-5 pb-2.5 font-black">
            벤치
          </p>
          <div className="border-border-table text-micro-lg text-text-4 grid h-7 grid-cols-[24px_minmax(0,1fr)_62px_42px_42px] items-center gap-2 border-b">
            <span className="text-center">#</span>
            <span>선수</span>
            <span>팀</span>
            <span className="text-center">포지션</span>
            <span className="text-center">평점</span>
          </div>
          {[home, away].map((lineup) =>
            lineup.bench.map((bench) => {
              const tone = ratingTone(bench.rating);
              return (
                <button
                  key={`${lineup.team.shortName}-${bench.id}`}
                  type="button"
                  onClick={() => onPlayerTap(bench.id, lineup.team)}
                  className="border-border-soft hover:bg-elevate-2 focus-visible:outline-accent grid h-8.5 w-full grid-cols-[24px_minmax(0,1fr)_62px_42px_42px] items-center gap-2 border-b text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2"
                >
                  <span className="text-caption-lg text-text-4 text-center">
                    {bench.number ?? "-"}
                  </span>
                  <span className="text-body text-text-strong min-w-0 truncate font-bold">
                    {bench.name}
                  </span>
                  <span className="text-caption-lg text-text-3 truncate">
                    {lineup.team.shortName}
                  </span>
                  <span className="text-caption-lg text-text-3 text-center">
                    {bench.position}
                  </span>
                  <span
                    className={`text-label-lg text-center font-black ${
                      tone === "accent"
                        ? "text-accent"
                        : tone === "warn"
                          ? "text-warn"
                          : "text-text-3"
                    }`}
                  >
                    {bench.rating === null ? "-" : bench.rating.toFixed(1)}
                  </span>
                </button>
              );
            }),
          )}
        </>
      )}

      <PlayerMatchStatsModal
        matchId={matchId}
        live={live}
        player={player}
        onClose={() => setPlayer(null)}
      />
    </div>
  );
}

function PitchLine({
  lineup,
  players,
  onPlayerTap,
}: {
  lineup: TeamLineup;
  players: LineupPlayer[];
  onPlayerTap: (playerId: number, team: LiveTeam) => void;
}) {
  const colorVar = lineup.team.code
    ? TEAMS[lineup.team.code].colorVar
    : "--plk-avatar";
  return (
    <div className="flex items-start justify-around">
      {players.map((player) => {
        const tone = ratingTone(player.rating);
        return (
          <button
            key={player.id}
            type="button"
            onClick={() => onPlayerTap(player.id, lineup.team)}
            className="group focus-visible:outline-accent-bright flex w-20 flex-col items-center gap-0.75 focus-visible:outline-2"
          >
            <span
              className="text-media-on text-caption grid size-6.5 place-items-center rounded-full font-black transition-transform group-hover:scale-110"
              style={{ backgroundColor: `var(${colorVar})` }}
            >
              {player.number ?? "-"}
            </span>
            <span className="text-micro text-media-on w-full truncate text-center font-bold">
              {player.name}
            </span>
            {player.rating !== null && (
              <span
                className={`text-[9.5px] font-black ${
                  tone === "accent" ? "text-accent-bright" : "text-warn"
                }`}
              >
                {player.rating.toFixed(1)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

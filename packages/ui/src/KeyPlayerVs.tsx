"use client";

import { useState } from "react";
import type { LiveTeam } from "@plick/domain/live";
import {
  buildKeyPlayerStatRows,
  KEY_PLAYER_DEFAULT_LABEL,
  KEY_PLAYER_EMPTY_LABEL,
  KEY_PLAYER_NO_CANDIDATES,
  type KeyPlayerSide,
  type KeyPlayerSideInfo,
  type KeyPlayers,
  type KeyPlayerStatRow,
} from "@plick/domain/prediction";
import { PlayerPhoto } from "./PlayerPhoto";

/**
 * 프리뷰 키플레이어 VS (KAN-699, 시안 가이드 §5.3). 두 팀 대표 선수를 좌우에 두고(사진, 이름, 포지션,
 * `득표 64%`), OPEN이면 "바꾸기"로 후보 가로 목록을 펼쳐 투표한다. 아래는 출전, 골, 도움, 평점 네 줄의
 * 마주보기 막대다. 큰 쪽이 초록, 작은 쪽이 회색이고 값도 큰 쪽이 900이다.
 *
 * 표가 없어 평점 1위가 선 쪽(`isDefault`)은 득표 대신 `기본: 시즌 평점 1위`를 적는다. 선수가 없는 쪽
 * (`player: null`)은 빈 사진 칸에 `선수 미정`, 후보가 없으면 바꾸기를 두지 않는다. 내 표는 후보 이름을
 * 초록 700으로 가른다. 후보 목록은 한 번에 한 팀만 펼치고, 선수를 고르면 접는다. 같은 선수를 다시 누르면
 * 서버에 보내지 않고 접기만 한다(팀별 1표 UPSERT라 바꿀 게 없다). 펼친 채로 마감이 되면(`canVote`가
 * false로) 목록도 같이 걷어 409로 갈 길을 막는다.
 *
 * 투표 호출과 실패 안내는 앱이 맡고 여기는 `onVote`만 부른다. 앱과 웹이 같은 자리에 같은 모양을 그려 처음부터
 * 공용이다(ADR 0011). 사진 크기와 가로 목록의 좌우 흘림, 막대 열 폭만 `size`로 가른다.
 *
 * @param home 홈 팀
 * @param away 원정 팀
 * @param players 키플레이어 응답
 * @param canVote 투표할 수 있는가(OPEN). 마감 뒤는 바꾸기를 걷는다
 * @param voting 투표 요청이 나가 있는 동안 true. 후보를 또 누르지 못하게 한다
 * @param onVote 후보를 눌렀을 때. 팀 쪽과 선수 id
 * @param size `sm`은 앱(사진 72, 가로 목록이 화면 끝까지), `lg`는 웹 경기 상세(사진 80)
 */
export function KeyPlayerVs({
  home,
  away,
  players,
  canVote,
  voting = false,
  onVote,
  size = "sm",
}: {
  home: LiveTeam;
  away: LiveTeam;
  players: KeyPlayers;
  canVote: boolean;
  voting?: boolean;
  onVote: (side: KeyPlayerSide, playerId: number) => void;
  size?: "sm" | "lg";
}) {
  const [open, setOpen] = useState<KeyPlayerSide | null>(null);
  const toggle = (side: KeyPlayerSide) =>
    setOpen((current) => (current === side ? null : side));
  const rows = buildKeyPlayerStatRows(players.home.stats, players.away.stats);

  const side = (key: KeyPlayerSide) => (
    <Side
      team={key === "HOME" ? home : away}
      info={key === "HOME" ? players.home : players.away}
      canVote={canVote}
      open={open === key}
      onToggle={() => toggle(key)}
      size={size}
    />
  );

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {side("HOME")}
        {side("AWAY")}
      </div>
      {open && canVote && (
        <Candidates
          info={open === "HOME" ? players.home : players.away}
          myVote={open === "HOME" ? players.myVote.home : players.myVote.away}
          voting={voting}
          size={size}
          onPick={(playerId) => {
            setOpen(null);
            onVote(open, playerId);
          }}
        />
      )}
      <StatRows rows={rows} size={size} />
    </div>
  );
}

function Side({
  team,
  info,
  canVote,
  open,
  onToggle,
  size,
}: {
  team: LiveTeam;
  info: KeyPlayerSideInfo;
  canVote: boolean;
  open: boolean;
  onToggle: () => void;
  size: "sm" | "lg";
}) {
  const player = info.player;
  const showToggle = canVote && info.candidates.length > 0;
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.25">
      <PlayerPhoto
        src={player?.photo ?? null}
        name={player?.name ?? `${team.name} 키플레이어`}
        size={size === "lg" ? 80 : 72}
        square
        className="rounded-tile mb-0.75"
      />
      <span className="text-body-md text-text-strong max-w-full truncate font-bold">
        {player?.name ?? KEY_PLAYER_EMPTY_LABEL}
      </span>
      {player && (
        <span className="flex items-baseline gap-1.25">
          {player.position && (
            <span className="text-caption text-text-4">{player.position}</span>
          )}
          {info.isDefault ? (
            <span className="text-caption text-text-4">
              {KEY_PLAYER_DEFAULT_LABEL}
            </span>
          ) : (
            <>
              <span className="text-label text-text-3">득표</span>
              <span className="text-body text-text-strong font-black tabular-nums">
                {info.votePercent}%
              </span>
            </>
          )}
        </span>
      )}
      {showToggle && (
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          className={`text-body text-accent hover:text-accent-hover focus-visible:outline-accent font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
            size === "lg" ? "px-2 py-1" : "-my-1.5 px-2.5 py-3"
          }`}
        >
          바꾸기
        </button>
      )}
    </div>
  );
}

/** 후보 가로 목록. 직전 선발이 먼저, 득표율 내림차순(BE가 정렬). 내 표는 이름이 초록 700이다. */
function Candidates({
  info,
  myVote,
  voting,
  size,
  onPick,
}: {
  info: KeyPlayerSideInfo;
  myVote: number | null;
  voting: boolean;
  size: "sm" | "lg";
  onPick: (playerId: number) => void;
}) {
  const bleed = size === "lg" ? "mt-3.5 px-3" : "-mx-edge px-edge mt-4";
  if (info.candidates.length === 0) {
    return (
      <p
        className={`bg-elevate text-label text-text-4 py-4 text-center ${bleed}`}
      >
        {KEY_PLAYER_NO_CANDIDATES}
      </p>
    );
  }
  return (
    <div
      role="group"
      aria-label="키플레이어 후보"
      className={`no-scrollbar bg-elevate flex gap-2.5 overflow-x-auto py-3 ${bleed}`}
    >
      {info.candidates.map((candidate) => {
        const mine = candidate.id === myVote;
        return (
          <button
            key={candidate.id}
            type="button"
            aria-pressed={mine}
            disabled={voting}
            onClick={() => {
              if (!mine) onPick(candidate.id);
            }}
            className="focus-visible:outline-accent flex w-15 shrink-0 flex-col items-center gap-1 focus-visible:outline-2 disabled:opacity-60"
          >
            <PlayerPhoto
              src={candidate.photo}
              name={candidate.name}
              size={48}
              square
              className="rounded-tile"
            />
            <span
              className={`text-label max-w-full truncate ${
                mine ? "text-accent font-bold" : "text-text-strong font-medium"
              }`}
            >
              {candidate.name}
            </span>
            <span className="text-caption text-text-4 tabular-nums">
              {candidate.votePercent}%
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** 출전, 골, 도움, 평점 마주보기 막대. 큰 쪽 초록, 작은 쪽 회색, 같으면 둘 다 회색. */
function StatRows({
  rows,
  size,
}: {
  rows: KeyPlayerStatRow[];
  size: "sm" | "lg";
}) {
  const cols =
    size === "lg"
      ? "grid-cols-[2.5rem_minmax(0,1fr)_2.75rem_minmax(0,1fr)_2.5rem] gap-2"
      : "grid-cols-[2.25rem_minmax(0,1fr)_2.5rem_minmax(0,1fr)_2.25rem] gap-1.5";
  return (
    <div className="flex flex-col gap-3.25 pt-5">
      {rows.map((row) => (
        <div key={row.key} className={`grid items-center ${cols}`}>
          <span
            className={`text-body-md text-text-strong text-right tabular-nums ${
              row.better === "home" ? "font-black" : "font-medium"
            }`}
          >
            {row.home}
          </span>
          <span className="flex justify-end">
            <span
              className={`rounded-pill h-1.5 ${
                row.better === "home" ? "bg-accent" : "bg-muted"
              }`}
              style={{ width: `${row.homeRatio}%` }}
            />
          </span>
          <span className="text-label text-text-3 text-center">
            {row.label}
          </span>
          <span className="flex">
            <span
              className={`rounded-pill h-1.5 ${
                row.better === "away" ? "bg-accent" : "bg-muted"
              }`}
              style={{ width: `${row.awayRatio}%` }}
            />
          </span>
          <span
            className={`text-body-md text-text-strong tabular-nums ${
              row.better === "away" ? "font-black" : "font-medium"
            }`}
          >
            {row.away}
          </span>
        </div>
      ))}
    </div>
  );
}

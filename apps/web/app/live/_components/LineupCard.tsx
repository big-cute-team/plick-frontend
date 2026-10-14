import Link from "next/link";
import { LiveCrest } from "@plick/ui/LiveCrest";
import { TEAMS } from "@plick/domain/constants";
import { playerProfilePath } from "@plick/domain/format";
import {
  lineupPitchLines,
  ratingTone,
  type LineupPlayer,
  type TeamLineup,
} from "@plick/domain/live";

/**
 * 라인업 탭 (KAN-462 → KAN-567 시안 경기 상세 922-970행). 팀명 13.5/700 + 포메이션 12
 * 줄 아래 짙은 초록 피치(`bg-pitch`, 각진, 위아래 20px 좌우 16px, 최소 280px)에 선수를
 * 줄 단위로 깐다. 선수는 등번호 원 26(11/900) + 이름 10/700 흰색 + 평점 9.5/900이다.
 * `grid`는 "줄:칸"(GK가 1줄), 원정 위, 홈 아래 반전(명세 규약)이고 칸 좌우는
 * `lineupPitchLines`가 팀 방향에 맞춰 정한다(KAN-551). 선수(피치와 벤치)를 누르면
 * 선수 프로필(`/players/<id>`)로 간다(KAN-600). 전에는 이 경기 스탯 다이얼로그가
 * 열렸는데 선수 링크 규칙을 한 갈래로 맞추면서 프로필로 바꿨다. 라인업의 `id`가
 * API 선수 id라 그대로 쓴다.
 *
 * 시안의 "선수별 스탯" 표(출전, 슈팅, 패스, 평점)는 선수 전원의 경기 스탯을 한 번에
 * 주는 API가 없어 팀별 벤치 표로 대신한다(번호, 선수, 포지션, 평점).
 *
 * @param home 홈 라인업
 * @param away 원정 라인업
 */
export function LineupCard({
  home,
  away,
}: {
  home: TeamLineup;
  away: TeamLineup;
}) {
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
            <PitchLine key={`away-${i}`} lineup={away} players={line} />
          ))}
          {lineupPitchLines(home.players, "up")
            .reverse()
            .map((line, i) => (
              <PitchLine key={`home-${i}`} lineup={home} players={line} />
            ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-6 lg:grid-cols-2">
        {[home, away].map((lineup) => (
          <BenchTable
            key={lineup.team.id ?? lineup.team.name}
            lineup={lineup}
          />
        ))}
      </div>
    </div>
  );
}

/** 팀명과 엠블럼 아래 한 팀의 벤치 선수만 표시한다. */
function BenchTable({ lineup }: { lineup: TeamLineup }) {
  if (lineup.bench.length === 0) return null;

  return (
    <section className="min-w-0">
      <h3 className="text-body-md text-text-strong flex items-center gap-2 pt-5 pb-2.5 font-black">
        <LiveCrest team={lineup.team} size={20} />
        <span>{lineup.team.name} 벤치</span>
      </h3>
      <div className="border-border-table text-micro-lg text-text-4 grid h-7 grid-cols-[1.5rem_minmax(0,1fr)_2.625rem_2.625rem] items-center gap-2 border-b">
        <span className="text-center">#</span>
        <span>선수</span>
        <span className="text-center">포지션</span>
        <span className="text-center">평점</span>
      </div>
      {lineup.bench.map((bench) => {
        const tone = ratingTone(bench.rating);
        return (
          <Link
            key={bench.id}
            href={playerProfilePath(bench.id)}
            className="border-border-soft hover:bg-elevate-2 focus-visible:outline-accent grid h-8.5 w-full grid-cols-[1.5rem_minmax(0,1fr)_2.625rem_2.625rem] items-center gap-2 border-b text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2"
          >
            <span className="text-caption-lg text-text-4 text-center">
              {bench.number ?? "-"}
            </span>
            <span className="text-body text-text-strong min-w-0 truncate font-bold">
              {bench.name}
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
          </Link>
        );
      })}
    </section>
  );
}

function PitchLine({
  lineup,
  players,
}: {
  lineup: TeamLineup;
  players: LineupPlayer[];
}) {
  const colorVar = lineup.team.code
    ? TEAMS[lineup.team.code].colorVar
    : "--plk-avatar";
  return (
    <div className="flex items-start justify-around">
      {players.map((player) => {
        const tone = ratingTone(player.rating);
        return (
          <Link
            key={player.id}
            href={playerProfilePath(player.id)}
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
                className={`text-[0.59375rem] font-black ${
                  tone === "accent" ? "text-accent-bright" : "text-warn"
                }`}
              >
                {player.rating.toFixed(1)}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

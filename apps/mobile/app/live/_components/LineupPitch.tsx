import {
  lineupPitchLines,
  type LineupPlayer,
  type LiveTeam,
  type TeamLineup,
} from "@plick/domain/live";

/**
 * 라인업 탭의 세로 피치 (시안 KAN-567). 위에 팀명·포메이션 줄, 그 아래 초록 면
 * (radius 16)에 중앙선과 센터서클(흰 22%), 줄마다 44px 높이로 선수 원 24(등번호
 * 10.5/900)와 이름 10/700 흰 글자다. 홈은 위쪽(GK가 맨 위)이고 흰 원에 초록
 * 숫자, 원정은 아래쪽이고 반투명 원에 흰 숫자다. 시안이 홈을 위에 두므로 전의
 * 배치(원정 위)를 뒤집었다.
 *
 * `grid`는 "줄:칸" 좌표(GK가 1줄)다. 줄 순서와 칸 좌우는 `lineupPitchLines`가 팀
 * 방향에 맞춰 정한다(KAN-551). 위쪽 팀은 아래로 공격하니 `down`, 아래쪽 팀은
 * `up`이고 줄을 뒤집어 GK가 맨 아래에 온다. 시안의 5열 10행 고정 격자 대신 줄을
 * flex로 쌓는다. 포메이션마다 줄 수가 달라 격자를 고정하면 빈 줄이 남는다.
 *
 * 선수 원을 누르면 경기 스탯 시트가 열린다. 전에 원 옆에 달던 평점 배지는 시안에
 * 없고 아래 선수별 스탯 표가 평점을 맡아 뺐다.
 *
 * @param home 홈 라인업
 * @param away 원정 라인업
 * @param onPlayerTap 선수 탭 콜백(선수 id, 소속 팀). 클라 탭 컨테이너가 넘긴다
 */
export function LineupPitch({
  home,
  away,
  onPlayerTap,
}: {
  home: TeamLineup;
  away: TeamLineup;
  onPlayerTap: (playerId: number, team: LiveTeam) => void;
}) {
  return (
    <section>
      <div className="flex items-baseline gap-2 pt-4 pb-2.5">
        <span className="text-body text-text-strong min-w-0 truncate font-bold">
          {home.team.name}
        </span>
        <span className="text-caption-lg text-text-3 shrink-0">
          {home.formation}
        </span>
        <span className="flex-1" />
        <span className="text-caption-lg text-text-3 shrink-0">
          {away.formation}
        </span>
        <span className="text-body text-text-strong min-w-0 truncate font-bold">
          {away.team.name}
        </span>
      </div>
      <div className="bg-pitch rounded-card relative overflow-hidden px-1.5 py-3.5">
        <span
          aria-hidden
          className="bg-media-chip-border absolute top-1/2 right-0 left-0 h-px"
        />
        <span
          aria-hidden
          className="border-media-chip-border absolute top-1/2 left-1/2 size-20 -translate-x-1/2 -translate-y-1/2 rounded-full border"
        />
        <div className="relative flex flex-col">
          {lineupPitchLines(home.players, "down").map((line, i) => (
            <PitchLine
              key={`home-${i}`}
              lineup={home}
              players={line}
              side="home"
              onPlayerTap={onPlayerTap}
            />
          ))}
          {lineupPitchLines(away.players, "up")
            .reverse()
            .map((line, i) => (
              <PitchLine
                key={`away-${i}`}
                lineup={away}
                players={line}
                side="away"
                onPlayerTap={onPlayerTap}
              />
            ))}
        </div>
      </div>
    </section>
  );
}

function PitchLine({
  lineup,
  players,
  side,
  onPlayerTap,
}: {
  lineup: TeamLineup;
  players: LineupPlayer[];
  side: "home" | "away";
  onPlayerTap: (playerId: number, team: LiveTeam) => void;
}) {
  return (
    <div className="flex h-11 items-center justify-around">
      {players.map((player) => (
        <button
          key={player.id}
          type="button"
          onClick={() => onPlayerTap(player.id, lineup.team)}
          className="flex w-1/5 min-w-0 flex-col items-center gap-0.5 active:opacity-70"
        >
          <span
            className={`text-micro-lg grid size-6 place-items-center rounded-full font-black ${
              side === "home"
                ? "bg-media-on text-pitch"
                : "bg-media-chip-border text-media-on"
            }`}
          >
            {player.number ?? "-"}
          </span>
          <span className="text-micro text-media-on max-w-full truncate font-bold">
            {player.name}
          </span>
        </button>
      ))}
    </div>
  );
}

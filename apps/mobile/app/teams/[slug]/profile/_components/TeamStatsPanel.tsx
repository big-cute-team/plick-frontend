import type { ReactNode } from "react";
import { rem } from "@plick/domain/format";
import {
  teamLeaders,
  type TeamCompetitionStats,
  type TeamInjury,
  type TeamRecord,
  type TeamSquadMember,
} from "@plick/domain/team-profile";
import { PlayerLink } from "@/_components/PlayerLink";
import { ProfileSection } from "@/_components/ProfileSection";
import { MINUTE_BAR_MAX_PX } from "@/_constants/team-profile";

/** 성적 표 열 (시안: 라벨 + 34px 여섯 칸). */
const COLS = "grid-cols-[minmax(0,1fr)_repeat(6,2.125rem)]";

/**
 * 기록 탭 (KAN-604, 시안 팀 프로필 모바일 기록). 선택한 대회의 홈, 원정, 전체 성적 표,
 * 15분 6구간 득실 막대(폭 14, 위 radius 4, 최대 82), 시즌 지표 4x2 상자, 팀 내 득점과
 * 도움 2열, 부상자 순이다. 웹은 팀 내 순위와 부상자가 레일인데 모바일은 레일이 없어
 * 여기로 내렸다. 서버가 대회를 합산하지 않으므로 한 대회씩 보여 주고 값이 null이면 "-"다.
 *
 * @param stats 선택된 대회의 기록. 그 대회 기록이 없으면 null
 * @param players 선수단(팀 내 순위). null이면 그 섹션을 뺀다
 * @param competitionId 선택된 대회
 * @param injuries 다음 경기 기준 결장자
 * @param picker 대회 선택(첫 섹션 머리 오른쪽). 대회가 하나면 null이라 대회명을 쓴다
 */
export function TeamStatsPanel({
  stats,
  players,
  competitionId,
  injuries,
  picker,
}: {
  stats: TeamCompetitionStats | null;
  players: TeamSquadMember[] | null;
  competitionId: number;
  injuries: TeamInjury[];
  picker: ReactNode;
}) {
  const leaders = players
    ? [
        { label: "득점", rows: teamLeaders(players, competitionId, "goals") },
        { label: "도움", rows: teamLeaders(players, competitionId, "assists") },
      ]
    : [];

  return (
    <>
      {stats === null ? (
        <ProfileSection title="홈, 원정" action={picker}>
          <p className="text-body text-text-4 py-6">기록이 없어요</p>
        </ProfileSection>
      ) : (
        <StatsBody stats={stats} picker={picker} />
      )}

      {leaders.some((group) => group.rows.length > 0) && (
        <ProfileSection title="팀 내 순위">
          <div className="grid grid-cols-2 gap-4">
            {leaders.map((group) => (
              <div key={group.label}>
                <p className="text-caption text-text-3 pb-1">{group.label}</p>
                <ol>
                  {group.rows.map((leader, i) => (
                    <li key={leader.playerId}>
                      <PlayerLink
                        playerId={leader.playerId}
                        className="border-border-soft flex h-10 items-center gap-2 border-b active:opacity-70"
                      >
                        <span className="text-label text-text-4 w-3 tabular-nums">
                          {i + 1}
                        </span>
                        <span className="text-body text-text-strong min-w-0 flex-1 truncate font-bold">
                          {leader.name}
                        </span>
                        <span className="text-body text-text-strong font-black tabular-nums">
                          {leader.value}
                        </span>
                      </PlayerLink>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </ProfileSection>
      )}

      {injuries.length > 0 && (
        <ProfileSection title="부상자">
          {injuries.map((injury) => (
            <PlayerLink
              key={injury.playerId ?? injury.name}
              playerId={injury.playerId}
              className="border-border-soft flex min-h-11 items-center gap-3 border-b py-2 active:opacity-70"
            >
              <span className="text-body text-text-strong min-w-0 flex-1 truncate font-bold">
                {injury.name}
              </span>
              {injury.reason && (
                <span className="text-label text-text-3 shrink-0">
                  {injury.reason}
                </span>
              )}
            </PlayerLink>
          ))}
        </ProfileSection>
      )}
    </>
  );
}

function StatsBody({
  stats,
  picker,
}: {
  stats: TeamCompetitionStats;
  picker: ReactNode;
}) {
  const rows: { label: string; record: TeamRecord }[] = [
    { label: "홈", record: stats.home },
    { label: "원정", record: stats.away },
    { label: "전체", record: stats.total },
  ];
  const max = Math.max(
    1,
    ...stats.goalsByMinute.flatMap((b) => [b.scored, b.conceded]),
  );
  const barHeight = (value: number) =>
    rem(Math.round((value / max) * MINUTE_BAR_MAX_PX));
  const metrics = [
    { label: "경기당 득점", value: stats.goalsForPerMatch },
    { label: "경기당 실점", value: stats.goalsAgainstPerMatch },
    { label: "클린시트", value: stats.cleanSheets },
    { label: "무득점", value: stats.failedToScore },
    {
      label: "최다 연승",
      value:
        stats.longestWinStreak === null
          ? null
          : `${stats.longestWinStreak}연승`,
    },
    { label: "포메이션", value: stats.mainFormation },
    { label: "경고", value: stats.yellowCards },
    { label: "퇴장", value: stats.redCards },
  ];
  const cell = "text-label text-text-2 text-center tabular-nums";

  return (
    <>
      <ProfileSection
        title="홈, 원정"
        note={picker ? undefined : stats.competition}
        action={picker}
      >
        <div role="table">
          <div
            role="row"
            className={`border-border-table text-micro-lg text-text-4 grid h-7 items-center border-b ${COLS}`}
          >
            <span />
            <span className="text-center">경기</span>
            <span className="text-center">승</span>
            <span className="text-center">무</span>
            <span className="text-center">패</span>
            <span className="text-center">득점</span>
            <span className="text-center">실점</span>
          </div>
          {rows.map(({ label, record }) => (
            <div
              key={label}
              role="row"
              className={`border-border-soft grid h-11 items-center border-b ${COLS}`}
            >
              <span className="text-body text-text-strong font-bold">
                {label}
              </span>
              <span className={cell}>{record.played ?? "-"}</span>
              <span className={cell}>{record.win ?? "-"}</span>
              <span className={cell}>{record.draw ?? "-"}</span>
              <span className={cell}>{record.lose ?? "-"}</span>
              <span className={cell}>{record.goalsFor ?? "-"}</span>
              <span className={cell}>{record.goalsAgainst ?? "-"}</span>
            </div>
          ))}
        </div>
      </ProfileSection>

      {stats.goalsByMinute.length > 0 && (
        <ProfileSection
          title="시간대별 득실"
          action={
            <span className="text-caption text-text-3 flex items-center gap-2.5">
              <span className="flex items-center gap-1">
                <span aria-hidden className="bg-accent rounded-badge size-2" />
                득점
              </span>
              <span className="flex items-center gap-1">
                <span aria-hidden className="bg-muted rounded-badge size-2" />
                실점
              </span>
            </span>
          }
        >
          <div className="border-border-table grid h-28 grid-cols-6 items-end border-b pt-2">
            {stats.goalsByMinute.map((b) => (
              <div
                key={b.bucket}
                className="flex items-end justify-center gap-1"
              >
                <Bar value={b.scored} height={barHeight(b.scored)} scored />
                <Bar value={b.conceded} height={barHeight(b.conceded)} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-6 pt-1.5">
            {stats.goalsByMinute.map((b) => (
              <span
                key={b.bucket}
                className="text-caption text-text-4 text-center tabular-nums"
              >
                {b.bucket}&apos;
              </span>
            ))}
          </div>
        </ProfileSection>
      )}

      <ProfileSection title="시즌 지표">
        <dl className="bg-elevate-2 rounded-card grid grid-cols-4 gap-x-2 gap-y-3.5 p-3.5">
          {metrics.map(({ label, value }) => (
            <div key={label} className="flex min-w-0 flex-col gap-1">
              <dt className="text-caption text-text-3 truncate">{label}</dt>
              <dd className="text-title tracking-title text-text-strong leading-tight font-black whitespace-nowrap tabular-nums">
                {value ?? "-"}
              </dd>
            </div>
          ))}
        </dl>
      </ProfileSection>
    </>
  );
}

/** 득실 막대 하나. 위에 값을 쓰고 막대는 위쪽만 둥글다(시안 radius 4). */
function Bar({
  value,
  height,
  scored = false,
}: {
  value: number;
  height: string;
  scored?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className={`text-caption tabular-nums ${scored ? "text-text-strong font-bold" : "text-text-3"}`}
      >
        {value}
      </span>
      <span
        className={`w-3.5 rounded-t-[0.25rem] ${scored ? "bg-accent" : "bg-muted"}`}
        style={{ height }}
      />
    </div>
  );
}

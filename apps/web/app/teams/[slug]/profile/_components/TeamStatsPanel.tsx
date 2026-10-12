import type { ReactNode } from "react";
import { rem } from "@plick/domain/format";
import type {
  TeamCompetitionStats,
  TeamRecord,
} from "@plick/domain/team-profile";
import { MINUTE_BAR_MAX_PX } from "@/_constants/team-profile";
import { ProfileSection } from "@/_components/ProfileSection";

/** 성적 표 열 (시안 1361행: 라벨 + 56px 여섯 칸). */
const COLS = "grid-cols-[minmax(0,1fr)_repeat(6,3.5rem)]";

/**
 * 기록 탭 (KAN-599, 시안 팀 프로필 1357-1415행). 선택한 대회 하나의 홈, 원정, 전체 성적 표,
 * 15분 6구간 득실 막대(득점 강조색, 실점 `muted`, 폭 20, 최대 높이 92), 시즌 지표 8칸이다.
 * 서버가 대회를 합산하지 않으므로 화면도 한 대회씩 보여 준다. 값이 null이면 "-"다. 좁은
 * 화면에서는 표와 막대를 가로로 넘긴다.
 *
 * @param stats 선택된 대회의 기록. 그 대회 기록이 없으면 null
 * @param picker 대회 선택(섹션 머리 오른쪽). 대회가 하나라 없으면 제목 옆에 대회명을 쓴다
 */
export function TeamStatsPanel({
  stats,
  picker,
}: {
  stats: TeamCompetitionStats | null;
  picker: ReactNode;
}) {
  if (stats === null) {
    return (
      <ProfileSection title="홈, 원정" action={picker}>
        <p className="text-body text-text-4 py-7">기록이 없어요</p>
      </ProfileSection>
    );
  }
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
    { label: "무득점 경기", value: stats.failedToScore },
    {
      label: "최다 연승",
      value:
        stats.longestWinStreak === null
          ? null
          : `${stats.longestWinStreak}연승`,
    },
    { label: "주 포메이션", value: stats.mainFormation },
    { label: "경고", value: stats.yellowCards },
    { label: "퇴장", value: stats.redCards },
  ];
  const cell = "text-label text-text-3 text-center tabular-nums";

  return (
    <>
      <ProfileSection
        title="홈, 원정"
        note={picker ? undefined : stats.competition}
        action={picker}
      >
        <div className="overflow-x-auto">
          <div className="min-w-[26rem]">
            <div
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
                className={`border-border-soft grid h-10 items-center border-b ${COLS}`}
              >
                <span className="text-label-lg text-text-strong font-bold">
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
        </div>
      </ProfileSection>

      {stats.goalsByMinute.length > 0 && (
        <section aria-label="시간대별 득실">
          <div className="flex items-baseline gap-3.5 pb-4.5">
            <h2 className="text-body-lg text-text-strong font-black tracking-tight">
              시간대별 득실
            </h2>
            <span className="text-caption-lg text-text-3 ml-auto flex items-center gap-1.5">
              <span aria-hidden className="bg-accent size-2.5" />
              득점
            </span>
            <span className="text-caption-lg text-text-3 flex items-center gap-1.5">
              <span aria-hidden className="bg-muted size-2.5" />
              실점
            </span>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[22rem]">
              <div className="border-border-table grid h-32 grid-cols-6 items-end gap-3 border-b">
                {stats.goalsByMinute.map((b) => (
                  <div
                    key={b.bucket}
                    className="flex items-end justify-center gap-1.25"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-caption text-text-strong font-bold tabular-nums">
                        {b.scored}
                      </span>
                      <span
                        className="bg-accent w-5"
                        style={{ height: barHeight(b.scored) }}
                      />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-caption text-text-3 tabular-nums">
                        {b.conceded}
                      </span>
                      <span
                        className="bg-muted w-5"
                        style={{ height: barHeight(b.conceded) }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-6 gap-3 pt-2">
                {stats.goalsByMinute.map((b) => (
                  <span
                    key={b.bucket}
                    className="text-caption text-text-4 text-center tabular-nums"
                  >
                    {b.bucket}분
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <ProfileSection title="시즌 지표">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-5.5 pt-2.5 md:grid-cols-4">
          {metrics.map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-1.5">
              <dt className="text-caption-lg text-text-3">{label}</dt>
              <dd className="text-section text-text-strong leading-none font-black tracking-[-0.04em] whitespace-nowrap tabular-nums">
                {value ?? "-"}
              </dd>
            </div>
          ))}
        </dl>
      </ProfileSection>
    </>
  );
}

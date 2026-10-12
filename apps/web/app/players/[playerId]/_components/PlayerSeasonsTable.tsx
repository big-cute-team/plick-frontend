import type { PlayerSeasonLine } from "@plick/domain/player-profile";
import { profileRatingTone } from "@plick/domain/team-profile";
import { LiveCrest } from "@plick/ui/LiveCrest";
import { ProfileSection } from "@/_components/ProfileSection";
import { RATING_TONE_CLASS } from "@/_constants/profile";
import { LiveLoadError } from "@/live/_components/LiveLoadError";
import { TeamProfileLink } from "@/live/_components/TeamProfileLink";

/** 시즌별 기록 열 (시안 1568행: 시즌 80, 팀, 경기 50, 골 44, 도움 44, 평점 50). */
const COLS = "grid-cols-[5rem_minmax(0,1fr)_3.125rem_2.75rem_2.75rem_3.125rem]";

/**
 * 시즌별 기록 표 (KAN-600, 시안 선수 프로필 1566-1580행). 최근 시즌부터 시즌 x 대회 한 줄씩이고
 * 팀 칸에 대회명을 작게 붙인다. 서버는 기록이 없는 시즌을 빼고 준다. 빅6 팀은 팀 프로필 링크다.
 * 대회 선택과 무관하다.
 *
 * @param lines 시즌별 기록. null이면 불러오지 못한 것
 */
export function PlayerSeasonsTable({
  lines,
}: {
  lines: PlayerSeasonLine[] | null;
}) {
  const cell = "text-label text-text-3 text-center tabular-nums";
  return (
    <ProfileSection title="시즌별 기록">
      {lines === null ? (
        <LiveLoadError />
      ) : lines.length === 0 ? (
        <p className="text-body text-text-4 py-7">시즌 기록이 없어요</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[26rem]" role="table">
            <div
              role="row"
              className={`border-border-table text-micro-lg text-text-4 grid h-7 items-center gap-2 border-b ${COLS}`}
            >
              <span>시즌</span>
              <span>팀</span>
              <span className="text-center">경기</span>
              <span className="text-center">골</span>
              <span className="text-center">도움</span>
              <span className="text-center">평점</span>
            </div>
            {lines.map((line) => (
              <div
                key={`${line.season}-${line.competitionId}-${line.team?.name ?? ""}`}
                role="row"
                className={`border-border-soft grid h-10 items-center gap-2 border-b ${COLS}`}
              >
                <span className="text-label-lg text-text-2 tabular-nums">
                  {line.season}
                </span>
                <span className="flex min-w-0 items-center gap-1.75">
                  {line.team && (
                    <TeamProfileLink
                      team={line.team}
                      className="group focus-visible:outline-accent flex min-w-0 items-center gap-1.75 focus-visible:outline-2"
                    >
                      <LiveCrest team={line.team} size={18} />
                      <span
                        className={`text-label-lg text-text-strong truncate font-bold ${line.team.code ? "group-hover:text-accent" : ""}`}
                      >
                        {line.team.name}
                      </span>
                    </TeamProfileLink>
                  )}
                  <span className="text-caption text-text-4 shrink-0 truncate">
                    {line.competition}
                  </span>
                </span>
                <span className={cell}>{line.appearances ?? "-"}</span>
                <span className={cell}>{line.goals ?? "-"}</span>
                <span className={cell}>{line.assists ?? "-"}</span>
                <span
                  className={`text-label-lg text-center font-black tabular-nums ${RATING_TONE_CLASS[profileRatingTone(line.rating)]}`}
                >
                  {line.rating?.toFixed(1) ?? "-"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </ProfileSection>
  );
}

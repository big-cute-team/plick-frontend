import type { PlayerSeasonLine } from "@plick/domain/player-profile";
import { profileRatingTone } from "@plick/domain/team-profile";
import { LiveCrest } from "@plick/ui/LiveCrest";
import { ProfileSection } from "@/_components/ProfileSection";
import { RATING_TONE_CLASS } from "@/_constants/profile";
import { LiveLoadError } from "@/live/_components/LiveLoadError";
import { TeamProfileLink } from "@/live/_components/TeamProfileLink";

/** 시즌별 기록 열 (시안: 시즌, 팀, 경기, 골, 도움, 평점). */
const COLS = "grid-cols-[3.75rem_minmax(0,1fr)_2rem_1.75rem_1.75rem_2.25rem]";

/**
 * 기록 탭 아래 시즌별 기록 (KAN-604, 시안 선수 프로필 모바일). 최근 시즌부터 시즌 x 대회
 * 한 줄씩이고 서버는 기록이 없는 시즌을 빼고 준다. 같은 시즌의 리그와 컵이 따로 서므로 팀명
 * 아래에 대회명을 작게 붙인다(좁은 폭이라 웹처럼 옆에 두면 둘 다 잘린다). 빅6 팀은 팀 프로필
 * 링크다. 대회 선택과 무관하다.
 *
 * @param lines 시즌별 기록. null이면 불러오지 못한 것
 */
export function PlayerSeasonsTable({
  lines,
}: {
  lines: PlayerSeasonLine[] | null;
}) {
  const cell = "text-label text-text-2 text-center tabular-nums";
  return (
    <ProfileSection title="시즌별 기록">
      {lines === null ? (
        <LiveLoadError />
      ) : lines.length === 0 ? (
        <p className="text-body text-text-4 py-6">시즌 기록이 없어요</p>
      ) : (
        <div role="table">
          <div
            role="row"
            className={`border-border-table text-micro-lg text-text-4 grid h-7 items-center gap-1.5 border-b ${COLS}`}
          >
            <span>시즌</span>
            <span>팀</span>
            <span className="text-center">경기</span>
            <span className="text-center">골</span>
            <span className="text-center">도움</span>
            <span className="text-right">평점</span>
          </div>
          {lines.map((line, i) => (
            <div
              key={`${line.season}-${line.competitionId}-${i}`}
              role="row"
              className={`border-border-soft grid h-13 items-center gap-1.5 border-b ${COLS}`}
            >
              <span className="text-label text-text-2 tabular-nums">
                {line.season}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                {line.team && (
                  <TeamProfileLink
                    team={line.team}
                    className="flex min-w-0 items-center gap-1.5 active:opacity-70"
                  >
                    <LiveCrest team={line.team} size={18} decorative />
                    <span className="text-body text-text-strong truncate font-bold">
                      {line.team.name}
                    </span>
                  </TeamProfileLink>
                )}
                <span className="text-caption text-text-4 truncate">
                  {line.competition}
                </span>
              </span>
              <span className={cell}>{line.appearances ?? "-"}</span>
              <span className={cell}>{line.goals ?? "-"}</span>
              <span className={cell}>{line.assists ?? "-"}</span>
              <span
                className={`text-body text-right font-black tabular-nums ${RATING_TONE_CLASS[profileRatingTone(line.rating)]}`}
              >
                {line.rating?.toFixed(1) ?? "-"}
              </span>
            </div>
          ))}
        </div>
      )}
    </ProfileSection>
  );
}

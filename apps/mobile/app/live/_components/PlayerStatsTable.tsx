import {
  liveTeamLabel,
  ratingTone,
  type LiveTeam,
  type TeamLineup,
} from "@plick/domain/live";
import { ratedStarters } from "@/_utils/live";

/**
 * 라인업 탭의 "선수별 스탯" 표 (시안 KAN-567). 표 머리 28px 아래 행 36px, 칸은
 * 등번호 22, 선수, 팀 44, 평점 34다. 평점은 12.5/900이고 7.5 이상은 강조색, 미만은
 * warn(`ratingTone`), 아직 없으면 회색 "-"다. 양 팀 선발을 평점 높은 순으로 깐다.
 *
 * 시안에는 슈팅·패스 열이 더 있는데 라인업 응답에는 평점만 있어 두 열은 뺐다
 * (API 공백). 행을 누르면 선발과 같은 경기 스탯 시트가 열리고 거기서 슈팅·패스를
 * 본다.
 *
 * @param lineups 양 팀 라인업
 * @param onPlayerTap 선수 탭 콜백(선수 id, 소속 팀)
 */
export function PlayerStatsTable({
  lineups,
  onPlayerTap,
}: {
  lineups: { home: TeamLineup; away: TeamLineup };
  onPlayerTap: (playerId: number, team: LiveTeam) => void;
}) {
  const cols = "grid-cols-[22px_minmax(0,1fr)_44px_34px]";

  return (
    <section>
      <h2 className="text-body-lg text-text-strong tracking-section pt-5 pb-2 font-black">
        선수별 스탯
      </h2>
      <div
        className={`border-border-table text-micro-lg text-text-4 grid h-7 items-center gap-1.5 border-b ${cols}`}
      >
        <span className="text-center">#</span>
        <span>선수</span>
        <span>팀</span>
        <span className="text-center">평점</span>
      </div>
      {ratedStarters(lineups).map(({ player, team }) => {
        const tone = ratingTone(player.rating);
        return (
          <button
            key={player.id}
            type="button"
            onClick={() => onPlayerTap(player.id, team)}
            className={`border-border-soft grid h-9 w-full items-center gap-1.5 border-b text-left active:opacity-70 ${cols}`}
          >
            <span className="text-caption-lg text-text-4 text-center">
              {player.number ?? "-"}
            </span>
            <span className="text-body text-text-strong min-w-0 truncate font-bold">
              {player.name}
            </span>
            <span className="text-caption-lg text-text-3 truncate">
              {liveTeamLabel(team)}
            </span>
            <span
              className={`text-label-lg text-center font-black ${
                tone === "accent"
                  ? "text-accent"
                  : tone === "warn"
                    ? "text-warn"
                    : "text-text-4"
              }`}
            >
              {player.rating === null ? "-" : player.rating.toFixed(1)}
            </span>
          </button>
        );
      })}
    </section>
  );
}

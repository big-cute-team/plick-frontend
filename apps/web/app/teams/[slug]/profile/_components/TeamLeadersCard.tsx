import { teamLeaders, type TeamSquadMember } from "@plick/domain/team-profile";
import { PlayerLink } from "@/_components/PlayerLink";
import { RailCard } from "@/_components/RailCard";

/**
 * 레일 "팀 내 순위" (KAN-599, 시안 팀 프로필 1449-1464행). 서버가 순위를 주지 않아 선택한
 * 대회의 선수단 기록으로 득점, 도움 상위 3명을 FE가 고른다(`teamLeaders`). 둘 다 비면
 * 카드를 그리지 않는다.
 *
 * @param players 선수단
 * @param competitionId 선택된 대회
 */
export function TeamLeadersCard({
  players,
  competitionId,
}: {
  players: TeamSquadMember[];
  competitionId: number;
}) {
  const groups = [
    { label: "득점", rows: teamLeaders(players, competitionId, "goals") },
    { label: "도움", rows: teamLeaders(players, competitionId, "assists") },
  ].filter((group) => group.rows.length > 0);
  if (groups.length === 0) return null;

  return (
    <RailCard title="팀 내 순위">
      <div className="flex flex-col gap-3 px-3.5 py-3">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="text-caption-lg text-text-3 pb-1">{group.label}</p>
            <ol>
              {group.rows.map((leader, i) => (
                <li key={leader.playerId}>
                  <PlayerLink
                    playerId={leader.playerId}
                    className="group focus-visible:outline-accent flex h-7.5 items-center gap-2.5 focus-visible:outline-2"
                  >
                    <span className="text-label text-text-4 w-3 tabular-nums">
                      {i + 1}
                    </span>
                    <span className="text-body text-text-strong group-hover:text-accent min-w-0 flex-1 truncate font-bold">
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
    </RailCard>
  );
}

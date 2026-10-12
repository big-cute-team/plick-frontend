import { POSITION_LABEL, type LiveTeam } from "@plick/domain/live";
import type { TeamSquadMember } from "@plick/domain/team-profile";
import { LiveCrest } from "@plick/ui/LiveCrest";
import { PlayerPhoto } from "@plick/ui/PlayerPhoto";
import { PlayerLink } from "@/_components/PlayerLink";
import { RailCard } from "@/_components/RailCard";

/**
 * 레일 "{팀} 선수" (KAN-600, 시안 선수 프로필 1620-1632행). 같은 팀 선수 8명(본인 제외, 포지션 순,
 * 번호 순)을 사진 26, 번호, 이름, 포지션으로 깔고 각 줄이 선수 프로필 링크다. 머리에 소속팀
 * 엠블럼 18을 둔다. 선수단을 못 받았거나 비면 호출부가 카드를 뺀다.
 *
 * @param team 소속팀
 * @param players 고른 선수들
 */
export function TeammatesCard({
  team,
  players,
}: {
  team: LiveTeam;
  players: TeamSquadMember[];
}) {
  return (
    <RailCard
      title={`${team.name} 선수`}
      icon={<LiveCrest team={team} size={18} />}
    >
      <ul className="px-3.5 pt-1 pb-2">
        {players.map((player) => (
          <li key={player.playerId}>
            <PlayerLink
              playerId={player.playerId}
              className="group border-border-soft focus-visible:outline-accent flex h-10 items-center gap-2.5 border-b focus-visible:outline-2"
            >
              <PlayerPhoto
                src={player.photo}
                name={player.name}
                size={26}
                square
              />
              <span className="text-label text-text-4 w-5 tabular-nums">
                {player.number ?? ""}
              </span>
              <span className="text-body text-text-strong group-hover:text-accent min-w-0 flex-1 truncate font-bold">
                {player.name}
              </span>
              <span className="text-label text-text-3">
                {player.position ? POSITION_LABEL[player.position] : ""}
              </span>
            </PlayerLink>
          </li>
        ))}
      </ul>
    </RailCard>
  );
}

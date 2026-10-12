import { POSITION_LABEL, type LiveTeam } from "@plick/domain/live";
import type { TeamSquadMember } from "@plick/domain/team-profile";
import { PlayerPhoto } from "@plick/ui/PlayerPhoto";
import { PlayerLink } from "@/_components/PlayerLink";
import { ProfileSection } from "@/_components/ProfileSection";

/**
 * 개요 "{팀} 선수" (KAN-604, 시안 선수 프로필 모바일). 같은 팀 선수(본인 제외, 포지션 순,
 * 번호 순)를 가로로 미는 카드로 깐다. 카드는 사진 76 radius 14, 이름, "번호, 포지션"이고
 * 누르면 그 선수 프로필이다. 화면 끝까지 밀리도록 오른쪽 여백을 트랙이 먹는다. 선수단을
 * 못 받았거나 비면 호출부가 섹션을 뺀다.
 *
 * @param team 소속팀
 * @param players 고른 선수들
 */
export function TeammatesStrip({
  team,
  players,
}: {
  team: LiveTeam;
  players: TeamSquadMember[];
}) {
  return (
    <ProfileSection title={`${team.name} 선수`}>
      <ul className="no-scrollbar -mr-edge pr-edge flex gap-2.5 overflow-x-auto pt-1">
        {players.map((player) => (
          <li key={player.playerId} className="w-19 shrink-0">
            <PlayerLink
              playerId={player.playerId}
              className="flex flex-col gap-1.5 active:opacity-70"
            >
              <PlayerPhoto
                src={player.photo}
                name={player.name}
                size={76}
                square
                className="rounded-[0.875rem]"
              />
              <span className="text-label-lg text-text-strong truncate font-bold">
                {player.name}
              </span>
              <span className="text-caption text-text-3 truncate tabular-nums">
                {[
                  player.number,
                  player.position ? POSITION_LABEL[player.position] : null,
                ]
                  .filter((v) => v !== null)
                  .join(", ")}
              </span>
            </PlayerLink>
          </li>
        ))}
      </ul>
    </ProfileSection>
  );
}

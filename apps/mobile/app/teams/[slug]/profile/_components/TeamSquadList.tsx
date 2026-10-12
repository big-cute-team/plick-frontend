import { POSITION_LABEL } from "@plick/domain/live";
import {
  groupSquadByPosition,
  memberStats,
  profileRatingTone,
  type TeamSquadMember,
} from "@plick/domain/team-profile";
import { PlayerPhoto } from "@plick/ui/PlayerPhoto";
import { PlayerLink } from "@/_components/PlayerLink";
import { ProfileSection } from "@/_components/ProfileSection";
import { RATING_TONE_CLASS } from "@/_constants/profile";

/**
 * 선수단 탭 (KAN-604, 시안 팀 프로필 모바일 선수단). 포지션 묶음(골키퍼, 수비수, 미드필더,
 * 공격수)마다 섹션이고 행은 사진 40 radius 10, 이름 14/700 + "부상", 아래 "번호, 나이,
 * 국적", 오른쪽에 선택 대회의 "N경기 N골 N도움"과 평점이다. 행 전체가 선수 프로필 링크다.
 *
 * 나이와 국적은 시즌 기록이 없는 선수면 null이라 뺀다. 선택 대회 항목이 없는 선수는 기록
 * 줄이 "-"다(0이 아니다).
 *
 * @param players 선수단
 * @param competitionId 선택된 대회
 */
export function TeamSquadList({
  players,
  competitionId,
}: {
  players: TeamSquadMember[];
  competitionId: number;
}) {
  return (
    <>
      {groupSquadByPosition(players).map((group) => (
        <ProfileSection
          key={group.position ?? "none"}
          title={group.position ? POSITION_LABEL[group.position] : "기타"}
        >
          {group.players.map((member) => (
            <SquadRow
              key={member.playerId}
              member={member}
              competitionId={competitionId}
            />
          ))}
        </ProfileSection>
      ))}
    </>
  );
}

function SquadRow({
  member,
  competitionId,
}: {
  member: TeamSquadMember;
  competitionId: number;
}) {
  const stats = memberStats(member, competitionId);
  const rating = stats?.rating ?? null;
  const facts = [
    member.number !== null ? `${member.number}번` : null,
    member.age !== null ? `${member.age}세` : null,
    member.nationality,
  ]
    .filter(Boolean)
    .join(", ");
  const record = stats
    ? `${stats.appearances ?? "-"}경기 ${stats.goals ?? "-"}골 ${stats.assists ?? "-"}도움`
    : "-";

  return (
    <PlayerLink
      playerId={member.playerId}
      className="border-border-soft flex items-center gap-3 border-b py-2.5 active:opacity-70"
    >
      <PlayerPhoto
        src={member.photo}
        name={member.name}
        size={40}
        square
        className="rounded-tile"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="text-body-md text-text-strong truncate font-bold">
            {member.name}
          </span>
          {member.injured && (
            <span className="text-caption text-warn shrink-0 font-bold">
              부상
            </span>
          )}
        </span>
        {facts && (
          <span className="text-label text-text-3 truncate">{facts}</span>
        )}
      </span>
      <span className="text-caption text-text-3 shrink-0 tabular-nums">
        {record}
      </span>
      <span
        className={`text-body-lg w-7.5 shrink-0 text-right font-black tabular-nums ${RATING_TONE_CLASS[profileRatingTone(rating)]}`}
      >
        {rating?.toFixed(1) ?? "-"}
      </span>
    </PlayerLink>
  );
}

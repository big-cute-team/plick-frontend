import { POSITION_LABEL } from "@plick/domain/live";
import {
  groupSquadByPosition,
  memberStats,
  profileRatingTone,
  type TeamSquadMember,
} from "@plick/domain/team-profile";
import { PlayerPhoto } from "@plick/ui/PlayerPhoto";
import { RATING_TONE_CLASS } from "@/_constants/profile";
import { PlayerLink } from "@/_components/PlayerLink";

/** 선수단 표 열 (시안 1338행: #, 선수, 나이, 국적, 경기, 골, 도움, 평점). */
const COLS =
  "grid-cols-[2rem_minmax(0,1fr)_2.75rem_5.75rem_2.75rem_2.5rem_2.5rem_3rem]";

/**
 * 선수단 탭 표 (KAN-599, 시안 팀 프로필 1331-1356행). 포지션 묶음마다 표 머리(묶음 이름
 * 13/900 + 열 머리 10.5)를 두고 행 40px에 번호, 사진 28 + 이름 + "부상", 나이, 국적,
 * 선택 대회의 경기, 골, 도움, 평점을 깐다. 행 전체가 선수 프로필 링크다.
 *
 * 나이와 국적은 시즌 기록이 없는 선수면 null이라 "-"다. 선택 대회 항목이 없는 선수는
 * 기록 칸이 "-"다(0이 아니다). 좁은 화면에서는 열을 숨기지 않고 표만 가로로 넘긴다.
 *
 * @param players 선수단
 * @param competitionId 선택된 대회
 */
export function TeamSquadTable({
  players,
  competitionId,
}: {
  players: TeamSquadMember[];
  competitionId: number;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[34rem] flex-col gap-9.5">
        {groupSquadByPosition(players).map((group) => (
          <div key={group.position ?? "none"} role="table">
            <div
              role="row"
              className={`border-border-table text-micro-lg text-text-4 grid h-7 items-center gap-2 border-b ${COLS}`}
            >
              <span className="text-center">#</span>
              <span className="text-label-lg text-text-strong font-black">
                {group.position ? POSITION_LABEL[group.position] : "기타"}
              </span>
              <span className="text-center">나이</span>
              <span>국적</span>
              <span className="text-center">경기</span>
              <span className="text-center">골</span>
              <span className="text-center">도움</span>
              <span className="text-center">평점</span>
            </div>
            {group.players.map((member) => (
              <SquadRow
                key={member.playerId}
                member={member}
                competitionId={competitionId}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
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
  const cell = "text-label text-text-3 text-center tabular-nums";
  return (
    <PlayerLink
      playerId={member.playerId}
      className={`border-border-soft hover:bg-elevate-2 focus-visible:outline-accent grid h-10 items-center gap-2 border-b focus-visible:outline-2 focus-visible:-outline-offset-2 ${COLS}`}
    >
      <span className={cell}>{member.number ?? "-"}</span>
      <span className="flex min-w-0 items-center gap-2 overflow-hidden">
        <PlayerPhoto src={member.photo} name={member.name} size={28} square />
        <span className="text-body text-text-strong truncate font-bold">
          {member.name}
        </span>
        {member.injured && (
          <span className="text-caption text-warn shrink-0 font-bold">
            부상
          </span>
        )}
      </span>
      <span className={cell}>{member.age ?? "-"}</span>
      <span className="text-label text-text-3 truncate">
        {member.nationality ?? "-"}
      </span>
      <span className={cell}>{stats?.appearances ?? "-"}</span>
      <span className={cell}>{stats?.goals ?? "-"}</span>
      <span className={cell}>{stats?.assists ?? "-"}</span>
      <span
        className={`text-label-lg text-center font-black tabular-nums ${RATING_TONE_CLASS[profileRatingTone(rating)]}`}
      >
        {rating?.toFixed(1) ?? "-"}
      </span>
    </PlayerLink>
  );
}

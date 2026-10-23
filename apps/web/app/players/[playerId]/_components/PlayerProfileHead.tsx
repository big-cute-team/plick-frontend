import { birthLabel, type PlayerProfile } from "@plick/domain/player-profile";
import { LiveCrest } from "@plick/ui/LiveCrest";
import { PlayerPhoto } from "@plick/ui/PlayerPhoto";
import { TeamProfileLink } from "@/live/_components/TeamProfileLink";

/**
 * 선수 프로필 머리 (KAN-600, 시안 선수 프로필 1480-1503행). 사진 150 정사각, 등번호 상자
 * (강조색 면 13/900) + 포지션, 이름 36/900, 영문명, 소속팀 엠블럼 + 이름(빅6면 팀 프로필 링크).
 * 오른쪽은 2열 정보(생년월일과 나이, 국적, 키, 몸무게)이고 부상이면 "상태 부상, 사유"를
 * `warn`으로 더한다. 값이 없는 정보 칸은 "-"다.
 *
 * @param profile 선수 프로필
 */
export function PlayerProfileHead({ profile }: { profile: PlayerProfile }) {
  const bio = [
    { label: "생년월일", value: birthLabel(profile.birthDate, profile.age) },
    { label: "국적", value: profile.nationality },
    {
      label: "키",
      value: profile.heightCm === null ? null : `${profile.heightCm}cm`,
    },
    {
      label: "몸무게",
      value: profile.weightKg === null ? null : `${profile.weightKg}kg`,
    },
  ];
  const team = profile.team;

  return (
    <header className="grid grid-cols-[6rem_minmax(0,1fr)] items-end gap-x-5 gap-y-6 pb-6.5 md:grid-cols-[9.375rem_minmax(0,1fr)_auto] md:gap-x-7">
      <PlayerPhoto
        src={profile.photo}
        name={profile.name}
        size={150}
        square
        className="size-24! md:size-37.5!"
      />
      <div className="min-w-0 pb-0.5">
        <div className="flex items-center gap-2.25">
          {profile.number !== null && (
            <span className="bg-accent text-on-accent text-label-lg inline-flex h-6 min-w-6.5 items-center justify-center px-1.5 font-black tabular-nums">
              {profile.number}
            </span>
          )}
          {profile.positionName && (
            <span className="text-label-lg text-text-2 font-bold">
              {profile.positionName}
            </span>
          )}
        </div>
        <h1 className="text-text-strong truncate pt-2.5 text-[2.25rem] leading-[1.15] font-black tracking-[-0.05em]">
          {profile.name}
        </h1>
        {profile.nameEn && profile.nameEn !== profile.name && (
          <p className="text-body-md text-text-3 truncate pt-1.25">
            {profile.nameEn}
          </p>
        )}
        {team && (
          <TeamProfileLink
            team={team}
            className="group focus-visible:outline-accent mt-3.5 inline-flex items-center gap-1.75 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <LiveCrest team={team} size={20} decorative />
            <span
              className={`text-body-md text-text font-bold ${team.code ? "group-hover:text-accent" : ""}`}
            >
              {team.name}
            </span>
          </TeamProfileLink>
        )}
      </div>
      <dl className="col-span-2 grid grid-cols-2 gap-x-10 gap-y-4 pb-0.5 md:col-span-1 md:grid-cols-[repeat(2,auto)]">
        {bio.map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-1.25">
            <dt className="text-caption-lg text-text-3">{label}</dt>
            <dd className="text-body-lg text-text-strong font-bold whitespace-nowrap tabular-nums">
              {value ?? "-"}
            </dd>
          </div>
        ))}
        {profile.injured && (
          <div className="flex flex-col gap-1.25">
            <dt className="text-caption-lg text-text-3">상태</dt>
            <dd className="text-body-lg text-warn font-bold">
              {["부상", profile.injuryReason].filter(Boolean).join(", ")}
            </dd>
          </div>
        )}
      </dl>
    </header>
  );
}

import { birthLabel, type PlayerProfile } from "@plick/domain/player-profile";
import { LiveCrest } from "@plick/ui/LiveCrest";
import { PlayerPhoto } from "@plick/ui/PlayerPhoto";
import { TeamProfileLink } from "@/live/_components/TeamProfileLink";

/**
 * 선수 프로필 머리 (KAN-604, 시안 선수 프로필 모바일). 사진 96 radius 16(상단 기준 크롭,
 * 없으면 `chip` 빈 면), 등번호 배지(강조색 radius 6) + 포지션, 이름 23/900, 영문명, 소속팀
 * 엠블럼 18 + 이름(빅6면 팀 프로필 링크)이다. 아래는 2열 신상(생년월일과 나이, 국적, 키와
 * 몸무게, 상태)이고 부상이면 상태를 `warn`으로 쓴다. 값이 없는 칸은 "-"다.
 *
 * @param profile 선수 프로필
 */
export function PlayerProfileHead({ profile }: { profile: PlayerProfile }) {
  const team = profile.team;
  const body = [
    profile.heightCm !== null ? `${profile.heightCm}cm` : null,
    profile.weightKg !== null ? `${profile.weightKg}kg` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const bio = [
    { label: "생년월일", value: birthLabel(profile.birthDate, profile.age) },
    { label: "국적", value: profile.nationality },
    { label: "키, 몸무게", value: body || null },
    {
      label: "상태",
      value: profile.injured
        ? ["부상", profile.injuryReason].filter(Boolean).join(", ")
        : "출전 가능",
      warn: profile.injured,
    },
  ];

  return (
    <>
      <header className="flex items-center gap-4 pt-5 pb-4.5">
        <PlayerPhoto
          src={profile.photo}
          name={profile.name}
          size={96}
          square
          className="rounded-card"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.75">
            {profile.number !== null && (
              <span className="bg-accent text-on-accent text-label-lg rounded-badge inline-flex h-5.5 min-w-6 items-center justify-center px-1.5 font-black tabular-nums">
                {profile.number}
              </span>
            )}
            {profile.positionName && (
              <span className="text-label-lg text-text-2 font-bold">
                {profile.positionName}
              </span>
            )}
          </div>
          <h1 className="text-profile tracking-title text-text-strong truncate pt-1.5 font-black">
            {profile.name}
          </h1>
          {profile.nameEn && profile.nameEn !== profile.name && (
            <p className="text-label-lg text-text-3 truncate">
              {profile.nameEn}
            </p>
          )}
          {team && (
            <TeamProfileLink
              team={team}
              className="mt-2 inline-flex items-center gap-1.5 active:opacity-70"
            >
              <LiveCrest team={team} size={18} />
              <span className="text-body text-text-strong font-bold">
                {team.name}
              </span>
            </TeamProfileLink>
          )}
        </div>
      </header>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 pb-4">
        {bio.map(({ label, value, warn }) => (
          <div key={label} className="flex min-w-0 flex-col gap-1">
            <dt className="text-caption text-text-3">{label}</dt>
            <dd
              className={`text-body-md truncate font-bold tabular-nums ${warn ? "text-warn" : "text-text-strong"}`}
            >
              {value ?? "-"}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}

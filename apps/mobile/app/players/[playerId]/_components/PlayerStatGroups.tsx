import type { StatGroup } from "@plick/domain/player-profile";
import { ProfileSection } from "@/_components/ProfileSection";

/**
 * 기록 탭 묶음 (KAN-604, 시안 선수 프로필 모바일 기록). 묶음(공격, 패스, 드리블과 경합,
 * 수비, 파울 / 골키퍼는 골키핑, 패스, 파울)을 세로로 쌓고 각 묶음은 머리(합계, 90분당)와
 * 행 43이다. 합계와 90분당 값은 `playerStatGroups`가 만든다.
 *
 * @param groups 기록 묶음
 */
export function PlayerStatGroups({ groups }: { groups: StatGroup[] }) {
  return (
    <>
      {groups.map((group) => (
        <ProfileSection
          key={group.label}
          title={group.label}
          action={
            <span className="text-caption text-text-4 flex">
              <span className="w-15 text-right">합계</span>
              <span className="w-15 text-right">90분당</span>
            </span>
          }
        >
          <div role="table" className="border-border-table border-t">
            {group.rows.map((row) => (
              <div
                key={row.label}
                role="row"
                className="border-border-soft flex h-10.75 items-center border-b"
              >
                <span className="text-body text-text-2 min-w-0 flex-1 truncate">
                  {row.label}
                </span>
                <span className="text-body-md text-text-strong w-15 text-right font-black tabular-nums">
                  {row.total}
                </span>
                <span className="text-label text-text-3 w-15 text-right tabular-nums">
                  {row.per90 ?? ""}
                </span>
              </div>
            ))}
          </div>
        </ProfileSection>
      ))}
    </>
  );
}

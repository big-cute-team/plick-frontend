import type { StatGroup } from "@plick/domain/player-profile";

/**
 * 기록 탭 묶음 (KAN-600, 시안 선수 프로필 1550-1564행). 묶음을 2열로 깔고 각 묶음은 머리(묶음
 * 이름 13/900, 합계, 90분당)와 행 38px이다. 합계와 90분당 값은 `playerStatGroups`가 만든다.
 *
 * @param groups 기록 묶음
 */
export function PlayerStatGroups({ groups }: { groups: StatGroup[] }) {
  return (
    <div className="grid grid-cols-1 gap-x-10 gap-y-8.5 md:grid-cols-2">
      {groups.map((group) => (
        <div key={group.label} role="table">
          <div
            role="row"
            className="border-border-table text-micro-lg text-text-4 grid h-7 grid-cols-[minmax(0,1fr)_3.75rem_3.75rem] items-center border-b"
          >
            <span className="text-label-lg text-text-strong font-black">
              {group.label}
            </span>
            <span className="text-right">합계</span>
            <span className="text-right">90분당</span>
          </div>
          {group.rows.map((row) => (
            <div
              key={row.label}
              role="row"
              className="border-border-soft grid h-9.5 grid-cols-[minmax(0,1fr)_3.75rem_3.75rem] items-center border-b"
            >
              <span className="text-label-lg text-text-2">{row.label}</span>
              <span className="text-body-md text-text-strong text-right font-bold tabular-nums">
                {row.total}
              </span>
              <span className="text-label text-text-3 text-right tabular-nums">
                {row.per90 ?? ""}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

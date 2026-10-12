import { LIVE_SEASON_LABEL } from "@plick/domain/live";
import { usageCounts, type PlayerMatch } from "@plick/domain/player-profile";
import { RailCard } from "@/_components/RailCard";
import { LiveLoadError } from "@/live/_components/LiveLoadError";

/**
 * 레일 "시즌 출전" (KAN-600, 시안 선수 프로필 1604-1619행). 막대(선발 강조색, 교체 `accent-bright`,
 * 결장 `form-loss` 바탕)와 세 줄 수치다. 소속팀 시즌 경기의 출전 형태를 세고 기록 조회 실패
 * (UNKNOWN) 경기는 뺀다. 대회 선택과 무관하게 시즌 전체 기준이다.
 *
 * @param matches 경기 기록. null이면 불러오지 못한 것
 */
export function PlayerUsageCard({
  matches,
}: {
  matches: PlayerMatch[] | null;
}) {
  const title = `${LIVE_SEASON_LABEL} 시즌 출전`;
  if (matches === null) {
    return (
      <RailCard title={title}>
        <LiveLoadError compact />
      </RailCard>
    );
  }
  const { started, sub, absent } = usageCounts(matches);
  const total = started + sub + absent;
  const width = (n: number) => `${total ? (n / total) * 100 : 0}%`;
  const rows = [
    { label: "선발", value: started, swatch: "bg-accent" },
    { label: "교체 출전", value: sub, swatch: "bg-accent-bright" },
    { label: "결장", value: absent, swatch: "bg-form-loss" },
  ];

  return (
    <RailCard title={title}>
      <div className="px-3.5 pt-3.5 pb-3">
        <div aria-hidden className="bg-form-loss flex h-2">
          <span className="bg-accent" style={{ width: width(started) }} />
          <span className="bg-accent-bright" style={{ width: width(sub) }} />
        </div>
        <dl className="flex flex-col pt-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className="border-border-soft flex h-7.5 items-center gap-2 border-b last:border-b-0"
            >
              <span aria-hidden className={`${row.swatch} size-2.25`} />
              <dt className="text-label-lg text-text-2 flex-1">{row.label}</dt>
              <dd className="text-body text-text-strong font-bold tabular-nums">
                {row.value}경기
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </RailCard>
  );
}

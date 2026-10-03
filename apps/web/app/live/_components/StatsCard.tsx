import { statHomeRatio, type MatchStat } from "@plick/domain/live";

/**
 * 스탯 탭의 팀 비교 (KAN-452 → KAN-567 시안 경기 상세 973-982행). 줄마다 홈 값 14/900,
 * 라벨 12.5 보조색, 원정 값을 양끝에 두고 아래 6px 막대(홈 강조색, 원정 `bg-muted`,
 * 각진)를 깐다. value 파싱 실패 시 막대만 생략한다(명세 함정 대응).
 */
export function StatsCard({ stats }: { stats: MatchStat[] }) {
  return (
    <div className="pt-5">
      {stats.map((stat) => {
        const ratio = statHomeRatio(stat);
        return (
          <div key={stat.label} className="pb-4">
            <p className="flex items-baseline justify-between pb-1.5">
              <span className="text-body-md text-text-strong font-black">
                {stat.home}
              </span>
              <span className="text-label-lg text-text-3">{stat.label}</span>
              <span className="text-body-md text-text-strong font-black">
                {stat.away}
              </span>
            </p>
            {ratio !== null && (
              <div aria-hidden className="flex h-1.5 gap-0.75">
                <span
                  className="bg-accent"
                  style={{ width: `${ratio * 100}%` }}
                />
                <span className="bg-muted flex-1" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

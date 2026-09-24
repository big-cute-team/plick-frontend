import { statHomeRatio, type MatchStat } from "@plick/domain/live";

/**
 * 스탯 탭의 좌우 비교 (시안 KAN-567). 항목마다 홈 값 14/900, 가운데 라벨 12.5
 * 보조색, 원정 값 14/900이 한 줄이고 그 아래 6px 막대 두 토막(홈은 강조색으로
 * 홈 비율만큼, 나머지는 회색 `muted`, 알약 라운드)이다. 제목 없이 항목만 쌓는다.
 *
 * value가 문자열 혼재라 파싱은 `statHomeRatio`가 맡고, 실패하면 막대만
 * 생략하고 값은 그대로 보여준다(명세 함정 대응).
 *
 * @param stats 팀 스탯 비교 행들
 */
export function StatsCompare({ stats }: { stats: MatchStat[] }) {
  return (
    <section className="pt-4.5">
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
                  className="bg-accent rounded-pill"
                  style={{ width: `${Math.round(ratio * 100)}%` }}
                />
                <span className="bg-muted rounded-pill flex-1" />
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

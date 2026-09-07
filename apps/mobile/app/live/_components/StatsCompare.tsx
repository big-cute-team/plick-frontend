import { statHomeRatio, type MatchStat } from "@plick/domain/live";

/**
 * 스탯 탭의 비교 카드(피그마 L8) — 값 두 개와 가운데 라벨, 아래 비율 막대.
 * value가 문자열 혼재라 파싱은 `statHomeRatio`가 맡고, 실패하면 막대만
 * 생략하고 값은 그대로 보여준다(명세 함정 대응). 홈은 accent, 어웨이는 info.
 */
export function StatsCompare({ stats }: { stats: MatchStat[] }) {
  return (
    <section className="bg-elevate rounded-card flex flex-col gap-3.5 p-4">
      <h2 className="text-body text-text-2 font-bold">경기 스탯</h2>
      {stats.map((stat) => {
        const ratio = statHomeRatio(stat);
        return (
          <div key={stat.label} className="flex flex-col gap-1.5">
            <p className="flex items-center justify-between">
              <span className="text-body text-text font-bold">{stat.home}</span>
              <span className="text-caption text-text-3 font-medium">
                {stat.label}
              </span>
              <span className="text-body text-text font-bold">{stat.away}</span>
            </p>
            {ratio !== null && (
              <div aria-hidden className="flex gap-0.5">
                <span
                  className="bg-accent h-1 rounded-full"
                  style={{ width: `${ratio * 100}%` }}
                />
                <span className="bg-info h-1 flex-1 rounded-full opacity-80" />
              </div>
            )}
          </div>
        );
      })}
      <p className="text-caption text-text-4 pt-0.5 text-center">
        전반·후반 분리 스탯은 제공되지 않아요
      </p>
    </section>
  );
}

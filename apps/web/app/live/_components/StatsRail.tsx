import {
  statHomeRatio,
  type MatchStat,
  type MatchStatus,
} from "@plick/domain/live";

/**
 * 상세 우측의 경기 스탯 레일(피그마 LW4) — 데스크톱은 탭 없이 스탯을 항상
 * 옆에 노출한다. value 파싱 실패 시 막대만 생략(명세 함정 대응). 홈 accent,
 * 어웨이 info.
 */
export function StatsRail({
  stats,
  status,
}: {
  stats: MatchStat[];
  status: MatchStatus;
}) {
  return (
    <div className="flex h-fit flex-col gap-3">
      <section className="bg-elevate rounded-card flex flex-col gap-3.5 px-4 py-4.5">
        <h2 className="text-body-lg text-text font-bold">경기 스탯</h2>
        {stats.map((stat) => {
          const ratio = statHomeRatio(stat);
          return (
            <div key={stat.label} className="flex flex-col gap-1.5">
              <p className="flex items-center justify-between">
                <span className="text-body text-text font-bold">
                  {stat.home}
                </span>
                <span className="text-caption text-text-3 font-medium">
                  {stat.label}
                </span>
                <span className="text-body text-text font-bold">
                  {stat.away}
                </span>
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
        <p className="text-caption text-text-4 text-center">
          전반·후반 분리 스탯은 제공되지 않아요
        </p>
      </section>
      <p className="text-caption text-text-4 text-center">
        {status === "LIVE"
          ? "라이브 중 20~30초마다 갱신돼요"
          : "경기가 끝났어요 · 확정 값이에요"}
      </p>
    </div>
  );
}

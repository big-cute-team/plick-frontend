import {
  statHomeRatio,
  type MatchStat,
  type MatchStatus,
} from "@plick/domain/live";

/**
 * 스탯 탭의 팀 스탯 비교 카드 (KAN-452 우측 레일 → KAN-462 탭 본문). 홈 accent,
 * 어웨이 info 막대에 값을 좌우로 크게 둔다. value 파싱 실패 시 막대만
 * 생략한다(명세 함정 대응).
 */
export function StatsCard({
  stats,
  status,
}: {
  stats: MatchStat[];
  status: MatchStatus;
}) {
  return (
    <div className="flex flex-col gap-3">
      <section className="bg-elevate rounded-card flex flex-col gap-5 px-6 py-6">
        <h2 className="text-title text-text font-bold">경기 스탯</h2>
        {stats.map((stat) => {
          const ratio = statHomeRatio(stat);
          return (
            <div key={stat.label} className="flex flex-col gap-2">
              <p className="flex items-center justify-between">
                <span className="text-title text-text font-bold">
                  {stat.home}
                </span>
                <span className="text-body text-text-3 font-medium">
                  {stat.label}
                </span>
                <span className="text-title text-text font-bold">
                  {stat.away}
                </span>
              </p>
              {ratio !== null && (
                <div aria-hidden className="flex gap-1">
                  <span
                    className="bg-accent h-2 rounded-full"
                    style={{ width: `${ratio * 100}%` }}
                  />
                  <span className="bg-info h-2 flex-1 rounded-full opacity-80" />
                </div>
              )}
            </div>
          );
        })}
        <p className="text-body text-text-4 text-center">
          전반·후반 분리 스탯은 제공되지 않아요
        </p>
      </section>
      <p className="text-body text-text-4 text-center">
        {status === "LIVE"
          ? "라이브 중 20~30초마다 갱신돼요"
          : "경기가 끝났어요 · 확정 값이에요"}
      </p>
    </div>
  );
}

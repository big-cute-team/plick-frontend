import type { StandingRow } from "@plick/domain/live";

/**
 * 팀 프로필의 숫자 4개 (KAN-514 순위 카드 → KAN-567 시안 프로필 1255-1264행). 순위,
 * 승점, 전적, 득실을 4열 그리드에 라벨 11.5 보조색 + 값 24/900으로 둔다. 챔스권이면
 * 순위 숫자를 강조색으로 칠한다. 순위표와 같은 규칙이라 두 화면이 같은 뜻으로 읽힌다.
 * 한 팀 기준의 값이라 `GET /standings` 20행에서 그 팀 행만 골라 쓴다. 전에는 파일
 * 이름이 `TeamStandingCard`였다.
 *
 * @param row 이 팀의 순위표 한 행
 */
export function TeamStatsRow({ row }: { row: StandingRow }) {
  const stats = [
    { label: "순위", value: `${row.rank}위`, accent: row.zone === "UCL" },
    { label: "승점", value: String(row.points) },
    { label: "전적", value: `${row.win}승 ${row.draw}무 ${row.lose}패` },
    {
      label: "득실",
      value: row.goalDiff > 0 ? `+${row.goalDiff}` : String(row.goalDiff),
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 py-5 pb-7.5 lg:grid-cols-4">
      {stats.map(({ label, value, accent }) => (
        <div key={label} className="flex flex-col gap-1.5">
          <span className="text-caption-lg text-text-3">{label}</span>
          <span
            className={`text-headline tracking-title leading-none font-black whitespace-nowrap ${accent ? "text-accent" : "text-text-strong"}`}
          >
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

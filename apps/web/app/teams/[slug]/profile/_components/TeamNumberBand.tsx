import { goalDiffLabel, type TeamStanding } from "@plick/domain/team-profile";
import { ResultBox } from "./ResultBox";

/**
 * 팀 프로필 숫자 띠 (KAN-599, 시안 팀 프로필 1238-1253행). `elevate` 면에 다섯 칸, 라벨
 * 11.5 보조색, 값 26/900 한 줄, 아래 보조 줄 11.5. 순위, 승점(N경기), 전적, 득실(N득점
 * N실점), 최근 5경기 칸이다. 대회 선택과 무관하게 EPL 순위표 기준이다.
 *
 * 순위표 행을 못 받으면(`standing` null) 칸은 두고 값을 "-"로 둔다. 득점이나 실점이
 * null이면 보조 줄의 그 값만 "-"다. 좁은 화면에서는 두 칸씩 접고 가장 긴 전적만 한 줄을 다 쓴다.
 *
 * @param standing EPL 순위표의 이 팀 행
 */
export function TeamNumberBand({
  standing,
}: {
  standing: TeamStanding | null;
}) {
  const s = standing;
  const cells = [
    { label: "순위", value: s ? `${s.rank}위` : "-" },
    {
      label: "승점",
      value: s ? String(s.points) : "-",
      sub: s && `${s.played}경기`,
    },
    {
      label: "전적",
      value: s ? `${s.win}승 ${s.draw}무 ${s.lose}패` : "-",
      wide: true,
    },
    {
      label: "득실",
      value: s ? goalDiffLabel(s.goalDiff) : "-",
      sub: s && `${s.goalsFor ?? "-"}득점 ${s.goalsAgainst ?? "-"}실점`,
    },
  ];

  return (
    <dl className="bg-elevate grid grid-cols-2 gap-y-5 py-4.5 md:grid-cols-5">
      {cells.map(({ label, value, sub, wide }) => (
        <div
          key={label}
          className={`flex min-w-0 flex-col gap-1.75 px-5.5 ${wide ? "max-md:col-span-2" : ""}`}
        >
          <dt className="text-caption-lg text-text-3">{label}</dt>
          <dd className="text-text-strong text-[1.625rem] leading-none font-black tracking-[-0.04em] whitespace-nowrap tabular-nums">
            {value}
          </dd>
          {sub && (
            <dd className="text-caption-lg text-text-3 whitespace-nowrap tabular-nums">
              {sub}
            </dd>
          )}
        </div>
      ))}
      <div className="flex min-w-0 flex-col gap-1.75 px-5.5">
        <dt className="text-caption-lg text-text-3">최근 5경기</dt>
        <dd className="flex gap-1">
          {s && s.form.length > 0 ? (
            s.form.map((result, i) => (
              <ResultBox key={i} result={result} size="lg" />
            ))
          ) : (
            <span className="text-text-strong text-[1.625rem] leading-none font-black">
              -
            </span>
          )}
        </dd>
      </div>
    </dl>
  );
}

import type { PlayerCompetitionStats } from "@plick/domain/player-profile";
import { RATING_TONE_CLASS } from "@/_constants/profile";

/**
 * 선수 프로필 숫자 띠 (KAN-600, 시안 선수 프로필 1504-1519행). `elevate` 면에 다섯 칸이고 선택한
 * 대회 기록을 따른다. 경기(선발 N), 출전 시간, 골, 도움, 평점(팀 내 N위)이고 골키퍼는 골, 도움
 * 대신 실점, 클린시트다. 평점은 7.5 이상이면 강조색이다. 팀 내 순위는 소속팀 항목에만 있어
 * 없으면 아래 줄을 뺀다. 그 대회 기록이 없으면 값이 전부 "-"다.
 *
 * @param stats 선택된 대회 기록. 없으면 null
 * @param isKeeper 골키퍼 구성
 * @param cleanSheets 선택 대회 클린시트(경기 기록에서 센 값). 모르면 null
 */
export function PlayerNumberBand({
  stats,
  isKeeper,
  cleanSheets,
}: {
  stats: PlayerCompetitionStats | null;
  isKeeper: boolean;
  cleanSheets: number | null;
}) {
  const s = stats;
  const n = (v: number | null | undefined) =>
    v === null || v === undefined ? "-" : String(v);
  const played = (v: number | null | undefined) =>
    v == null && s?.appearances ? "0" : n(v);
  const rating = s?.rating ?? null;
  const cells: {
    label: string;
    value: string;
    sub?: string | null;
    tone?: string;
  }[] = [
    {
      label: "경기",
      value: n(s?.appearances),
      sub: s?.lineups == null ? null : `선발 ${s.lineups}`,
    },
    {
      label: "출전 시간",
      value:
        s?.minutes == null ? "-" : `${s.minutes.toLocaleString("ko-KR")}분`,
    },
    ...(isKeeper
      ? [
          { label: "실점", value: n(s?.conceded) },
          { label: "클린시트", value: n(cleanSheets) },
        ]
      : [
          { label: "골", value: played(s?.goals) },
          { label: "도움", value: played(s?.assists) },
        ]),
    {
      label: "평점",
      value: rating === null ? "-" : rating.toFixed(1),
      sub: s?.ratingRank ? `팀 내 ${s.ratingRank.rank}위` : null,
      tone:
        rating !== null && rating >= 7.5
          ? RATING_TONE_CLASS.accent
          : "text-text-strong",
    },
  ];

  return (
    <dl className="bg-elevate grid grid-cols-2 gap-y-5 py-4.5 md:grid-cols-5">
      {cells.map(({ label, value, sub, tone }) => (
        <div key={label} className="flex min-w-0 flex-col gap-1.75 px-5.5">
          <dt className="text-caption-lg text-text-3">{label}</dt>
          <dd
            className={`${tone ?? "text-text-strong"} text-[1.625rem] leading-none font-black tracking-[-0.04em] whitespace-nowrap tabular-nums`}
          >
            {value}
          </dd>
          {sub && (
            <dd className="text-caption-lg text-text-4 whitespace-nowrap tabular-nums">
              {sub}
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}

import {
  zeroIfPlayed,
  type PlayerCompetitionStats,
} from "@plick/domain/player-profile";
import { RATING_TONE_CLASS } from "@/_constants/profile";

/**
 * 선수 숫자 상자 (KAN-604, 시안 선수 프로필 모바일). `elevate-2` 면 radius 16에 다섯 칸이고
 * 선택한 대회 기록을 따른다. 경기(선발 N), 출전 분, 골, 도움, 평점(팀 내 N위)이고 골키퍼는
 * 골, 도움 대신 실점, 클린시트다. 평점은 7.5 이상이면 강조색이다. 그 대회 기록이 없으면
 * 값이 전부 "-"다. 웹 숫자 띠(KAN-600)와 같은 규칙이다.
 *
 * @param stats 선택된 대회 기록. 없으면 null
 * @param isKeeper 골키퍼 구성
 * @param cleanSheets 선택 대회 클린시트(경기 기록에서 센 값). 모르면 null
 */
export function PlayerStatBox({
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
    { label: "출전", value: s?.minutes == null ? "-" : `${s.minutes}'` },
    ...(isKeeper
      ? [
          { label: "실점", value: n(s?.conceded) },
          { label: "클린시트", value: n(cleanSheets) },
        ]
      : [
          { label: "골", value: n(s && zeroIfPlayed(s.goals, s.appearances)) },
          {
            label: "도움",
            value: n(s && zeroIfPlayed(s.assists, s.appearances)),
          },
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
    <dl className="bg-elevate-2 rounded-card grid grid-cols-5 gap-x-1.5 p-3.5">
      {cells.map(({ label, value, sub, tone }) => (
        <div key={label} className="flex min-w-0 flex-col gap-1">
          <dt className="text-caption text-text-3 truncate">{label}</dt>
          <dd
            className={`${tone ?? "text-text-strong"} text-title tracking-title leading-tight font-black whitespace-nowrap tabular-nums`}
          >
            {value}
          </dd>
          {sub && (
            <dd className="text-caption text-text-4 whitespace-nowrap tabular-nums">
              {sub}
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}

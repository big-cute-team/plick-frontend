import { TEAMS } from "@plick/domain/constants";
import { kickoffDateLabel, kickoffTimeLabel } from "@plick/domain/live";
import {
  goalDiffLabel,
  placeLabel,
  type TeamSummary,
} from "@plick/domain/team-profile";
import type { TeamCode } from "@plick/domain/types";
import { LiveCrest } from "@plick/ui/LiveCrest";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { ResultChip } from "@/_components/ResultChip";
import { TeamProfileLink } from "@/live/_components/TeamProfileLink";

/**
 * 팀 프로필 머리 (KAN-604, 시안 팀 프로필 모바일). 엠블럼 64와 이름 23/900, 부제
 * "영문명, 리그, 연고지", 그 아래 숫자 상자와 다음 경기 상자다. 탭과 무관해 탭 줄 위에
 * 늘 서 있다.
 *
 * 숫자 상자는 `elevate-2` 면 radius 16에 순위, 승점, 전적, 득실 한 줄(시안 그리드
 * `auto auto minmax(max-content,1fr) auto`)과 구분선 아래 최근 5경기 칸이다. 요약의
 * `standing`이 null이면 값을 전부 "-"로 두고 최근 경기 줄은 뺀다. 다음 경기가 null이면
 * 상자를 뺀다.
 *
 * @param code 팀 코드(엠블럼)
 * @param summary 팀 요약. 요약을 못 받았으면 레지스트리 이름만 채운 대체값이다
 */
export function TeamProfileHead({
  code,
  summary,
}: {
  code: TeamCode;
  summary: TeamSummary;
}) {
  const { standing, nextFixture } = summary;
  const subtitle = [
    summary.nameEn,
    summary.leagueName,
    summary.info?.city && placeLabel(summary.info.city),
  ]
    .filter(Boolean)
    .join(", ");
  const cells: { label: string; value: string; end?: boolean }[] = [
    { label: "순위", value: standing ? `${standing.rank}위` : "-" },
    { label: "승점", value: standing ? String(standing.points) : "-" },
    {
      label: "전적",
      value: standing
        ? `${standing.win}승 ${standing.draw}무 ${standing.lose}패`
        : "-",
    },
    {
      label: "득실",
      value: standing ? goalDiffLabel(standing.goalDiff) : "-",
      end: true,
    },
  ];

  return (
    <>
      <header className="flex items-center gap-4 pt-5 pb-4">
        <TeamCrest team={TEAMS[code]} size={64} decorative />
        <div className="min-w-0 flex-1">
          <h1 className="text-profile tracking-title text-text-strong truncate font-black">
            {summary.name}
          </h1>
          {subtitle && (
            <p className="text-label-lg text-text-3 mt-1 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </header>

      <div className="bg-elevate-2 rounded-card">
        <dl
          className="grid gap-x-3.5 px-3.5 pt-3.5 pb-3"
          style={{
            gridTemplateColumns: "auto auto minmax(max-content, 1fr) auto",
          }}
        >
          {cells.map(({ label, value, end }) => (
            <div
              key={label}
              className={`flex min-w-0 flex-col gap-1.25 ${end ? "items-end" : ""}`}
            >
              <dt className="text-caption text-text-3">{label}</dt>
              <dd className="text-title tracking-title text-text-strong leading-tight font-black whitespace-nowrap tabular-nums">
                {value}
              </dd>
            </div>
          ))}
        </dl>
        {standing && standing.form.length > 0 && (
          <div className="border-border flex items-center justify-between border-t px-3.5 py-2.5">
            <span className="text-caption text-text-3">최근 5경기</span>
            <span className="flex gap-1">
              {standing.form.map((result, i) => (
                <ResultChip key={i} result={result} size="lg" />
              ))}
            </span>
          </div>
        )}
      </div>

      {nextFixture && (
        <div className="bg-elevate-2 rounded-card mt-2.5 flex items-center gap-3 px-3.5 py-3">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-caption text-text-3">다음 경기</span>
            <span className="text-label-lg text-text-strong font-bold whitespace-nowrap tabular-nums">
              {kickoffDateLabel(nextFixture.kickoffAt)}{" "}
              {kickoffTimeLabel(nextFixture.kickoffAt)}
            </span>
          </div>
          <span className="text-caption text-text-3 ml-auto shrink-0">
            {nextFixture.isHome ? "홈" : "원정"}
          </span>
          <TeamProfileLink
            team={nextFixture.opponent}
            className="flex min-w-0 items-center gap-2 active:opacity-70"
          >
            <LiveCrest team={nextFixture.opponent} size={26} decorative />
            <span className="text-body-lg text-text-strong max-w-32.5 truncate font-black">
              {nextFixture.opponent.name}
            </span>
          </TeamProfileLink>
        </div>
      )}
    </>
  );
}

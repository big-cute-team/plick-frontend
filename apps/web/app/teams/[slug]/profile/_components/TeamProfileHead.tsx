import { TEAMS } from "@plick/domain/constants";
import { kickoffDateLabel, kickoffTimeLabel } from "@plick/domain/live";
import { placeLabel, type TeamSummary } from "@plick/domain/team-profile";
import type { TeamCode } from "@plick/domain/types";
import { LiveCrest } from "@plick/ui/LiveCrest";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { TeamProfileLink } from "@/live/_components/TeamProfileLink";

/**
 * 팀 프로필 머리 (KAN-599, 시안 팀 프로필 1223-1236행). 엠블럼 88, 이름 36/900, 부제
 * "영문명, 리그, 연고지". 오른쪽 끝은 다음 경기 일시와 홈/원정, 상대 엠블럼 30, 상대명
 * 17/900이다. 다음 경기가 없으면(시즌 종료, 요약 일부 실패) 그 자리를 비운다. 상대가 빅6면
 * 팀 프로필로 링크한다.
 *
 * @param code 이 팀 레지스트리 코드(엠블럼)
 * @param summary 팀 요약
 */
export function TeamProfileHead({
  code,
  summary,
}: {
  code: TeamCode;
  summary: TeamSummary;
}) {
  const city = summary.info?.city;
  const sub = [summary.nameEn, summary.leagueName, city && placeLabel(city)]
    .filter(Boolean)
    .join(", ");
  const next = summary.nextFixture;

  return (
    <header className="flex flex-wrap items-center gap-x-6 gap-y-4 pb-6.5">
      <TeamCrest team={TEAMS[code]} size={88} className="shrink-0" />
      <div className="min-w-0 flex-1 basis-60">
        <h1 className="text-text-strong truncate text-[2.25rem] leading-[1.15] font-black tracking-[-0.05em]">
          {summary.name}
        </h1>
        <p className="text-body text-text-3 truncate pt-2">{sub}</p>
      </div>
      {next && (
        <div className="flex shrink-0 flex-col items-start gap-2.25 md:items-end">
          <span className="text-label text-text-3 tabular-nums">
            다음 경기 {kickoffDateLabel(next.kickoffAt)}{" "}
            {kickoffTimeLabel(next.kickoffAt)}
          </span>
          <TeamProfileLink
            team={next.opponent}
            className="group focus-visible:outline-accent flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <span className="text-label-lg text-text-3 font-bold">
              {next.isHome ? "홈" : "원정"}
            </span>
            <LiveCrest team={next.opponent} size={30} />
            <span
              className={`text-title text-text-strong font-black tracking-[-0.03em] ${next.opponent.code ? "group-hover:text-accent" : ""}`}
            >
              {next.opponent.name}
            </span>
          </TeamProfileLink>
        </div>
      )}
    </header>
  );
}

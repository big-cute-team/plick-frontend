import {
  kickoffDateLabel,
  kickoffTimeLabel,
  matchStatusLabel,
  type MatchSummary,
} from "@plick/domain/live";
import { LiveCrest } from "@plick/ui/LiveCrest";
import { TeamProfileLink } from "./TeamProfileLink";

/**
 * 경기 상세 스코어 헤더 (KAN-462 → KAN-567 시안 경기 상세 828-852행). 양쪽에 엠블럼
 * 72와 팀명 15/700, 가운데 최소 210px 칸에 킥오프 라벨 11.5 보조색, 스코어 46/900,
 * 진행 중이면 빨간 점 + 분, 아니면 상태 12/700 회색. 아래 섹션 구분선으로 끊는다.
 * 스코어 정본은 `header.score`다(명세 규약).
 *
 * 양쪽 팀은 팀 프로필로 가는 링크다 (KAN-484). 빅6 밖 팀은 프로필이 없어 글자로만 남는다.
 */
export function MatchHeaderCard({ header }: { header: MatchSummary }) {
  const scheduled =
    header.status === "SCHEDULED" || header.status === "POSTPONED";
  return (
    <div className="border-border flex items-center gap-4 border-b pb-6.5 lg:gap-6.5">
      <TeamSide team={header.home} />
      <div className="flex shrink-0 flex-col items-center gap-2.25 lg:min-w-52.5">
        <span className="text-caption-lg text-text-3">
          {kickoffDateLabel(header.kickoffAt)}{" "}
          {kickoffTimeLabel(header.kickoffAt)}
        </span>
        <span className="text-display text-text-strong tracking-title font-black">
          {scheduled
            ? header.status === "POSTPONED"
              ? "연기"
              : kickoffTimeLabel(header.kickoffAt)
            : `${header.score.home ?? "-"} : ${header.score.away ?? "-"}`}
        </span>
        <StatusLine header={header} />
      </div>
      <TeamSide team={header.away} />
    </div>
  );
}

function TeamSide({ team }: { team: MatchSummary["home"] }) {
  return (
    <TeamProfileLink
      team={team}
      className="group focus-visible:outline-accent flex min-w-0 flex-1 flex-col items-center gap-2.75 focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <LiveCrest team={team} size={72} />
      <span
        className={`text-body-lg group-hover:text-accent w-full truncate text-center font-bold transition-colors ${team.code ? "text-text-strong" : "text-text-3"}`}
      >
        {team.name}
      </span>
    </TeamProfileLink>
  );
}

function StatusLine({ header }: { header: MatchSummary }) {
  if (header.status === "LIVE") {
    const { primary, secondary } = matchStatusLabel(header);
    return (
      <span className="text-label text-danger flex items-center gap-1.5 font-bold">
        <span aria-hidden className="bg-danger size-1.25 rounded-full" />
        {secondary} {primary}
      </span>
    );
  }
  const label =
    header.status === "SCHEDULED"
      ? "킥오프 전"
      : header.status === "FINISHED"
        ? `경기 종료 ${header.statusDetail ?? "FT"}`
        : "추후 일정 공지";
  return <span className="text-label text-text-4 font-bold">{label}</span>;
}

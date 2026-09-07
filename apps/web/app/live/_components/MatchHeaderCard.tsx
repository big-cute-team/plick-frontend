import {
  kickoffDateLabel,
  kickoffTimeLabel,
  matchStatusLabel,
  type MatchSummary,
} from "@plick/domain/live";
import { LiveCrest } from "./LiveCrest";

/**
 * 경기 상세 헤더 카드(피그마 LW4·LW5) — 양 팀을 좌우 끝에, 가운데에 대회명·
 * 스코어(또는 킥오프 시각)·상태 칩을 세로로 쌓는다(라운드는 BE 미제공). 스코어 정본은
 * `header.score`다(명세 규약).
 */
export function MatchHeaderCard({ header }: { header: MatchSummary }) {
  return (
    <section className="bg-elevate rounded-card flex items-center gap-4 px-6 py-5 lg:px-8">
      <TeamSide team={header.home} align="start" />
      <div className="flex flex-1 flex-col items-center gap-1.5">
        <span className="text-caption text-text-4 font-medium">
          {header.competition}
        </span>
        {header.status === "SCHEDULED" || header.status === "POSTPONED" ? (
          <>
            <span className="text-headline text-text lg:text-read-title font-extrabold">
              {header.status === "POSTPONED"
                ? "연기"
                : kickoffTimeLabel(header.kickoffAt)}
            </span>
            <span className="text-caption text-text-4">
              {kickoffDateLabel(header.kickoffAt)}
            </span>
          </>
        ) : (
          <span className="text-headline text-text lg:text-read-title font-extrabold tracking-wide">
            {header.score.home ?? "-"} - {header.score.away ?? "-"}
          </span>
        )}
        <StatusChip header={header} />
      </div>
      <TeamSide team={header.away} align="end" />
    </section>
  );
}

function TeamSide({
  team,
  align,
}: {
  team: MatchSummary["home"];
  align: "start" | "end";
}) {
  return (
    <div
      className={`flex w-32 items-center gap-3 lg:w-44 ${
        align === "end" ? "flex-row-reverse" : ""
      }`}
    >
      <LiveCrest team={team} size={36} />
      <span
        className={`text-body-lg min-w-0 truncate font-semibold ${team.code ? "text-text" : "text-text-3"}`}
      >
        {team.name}
      </span>
    </div>
  );
}

function StatusChip({ header }: { header: MatchSummary }) {
  if (header.status === "LIVE") {
    const { primary, secondary } = matchStatusLabel(header);
    return (
      <span className="bg-danger/15 text-danger rounded-pill text-caption flex items-center gap-1 px-2.5 py-1 font-bold">
        <span aria-hidden className="bg-danger size-1.5 rounded-full" />
        LIVE · {secondary} {primary}
      </span>
    );
  }
  const label =
    header.status === "SCHEDULED"
      ? "킥오프 전"
      : header.status === "FINISHED"
        ? `경기 종료 · ${header.statusDetail ?? "FT"}`
        : "추후 일정 공지";
  return (
    <span className="bg-elevate-2 text-text-3 rounded-pill text-caption px-2.5 py-1 font-bold">
      {label}
    </span>
  );
}

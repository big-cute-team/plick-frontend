import {
  kickoffDateLabel,
  kickoffTimeLabel,
  matchStatusLabel,
  type MatchSummary,
} from "@plick/domain/live";
import { LiveCrest } from "./LiveCrest";

/**
 * 경기 상세 헤더 카드(피그마 LW4·LW5 → KAN-462 확대) — 네이버 스포츠 상세
 * 헤더처럼 양 팀 크레스트와 팀명을 좌우에 크게 세우고, 가운데에 대회명·킥오프
 * 날짜·스코어(또는 킥오프 시각)·상태 칩을 쌓는다(라운드는 BE 미제공). 스코어
 * 정본은 `header.score`다(명세 규약).
 */
export function MatchHeaderCard({ header }: { header: MatchSummary }) {
  const scheduled =
    header.status === "SCHEDULED" || header.status === "POSTPONED";
  return (
    <section className="bg-elevate rounded-card flex items-center gap-6 px-6 py-8 lg:px-10">
      <TeamSide team={header.home} />
      <div className="flex flex-1 flex-col items-center gap-2">
        <span className="text-body text-text-3 font-semibold">
          {header.competition} · {kickoffDateLabel(header.kickoffAt)}
        </span>
        <span className="text-display text-text font-extrabold tracking-wide">
          {scheduled
            ? header.status === "POSTPONED"
              ? "연기"
              : kickoffTimeLabel(header.kickoffAt)
            : `${header.score.home ?? "-"} - ${header.score.away ?? "-"}`}
        </span>
        <StatusChip header={header} />
      </div>
      <TeamSide team={header.away} />
    </section>
  );
}

function TeamSide({ team }: { team: MatchSummary["home"] }) {
  return (
    <div className="flex w-36 flex-col items-center gap-3 lg:w-52">
      <LiveCrest team={team} size={72} />
      <span
        className={`text-title w-full truncate text-center font-bold ${team.code ? "text-text" : "text-text-3"}`}
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
      <span className="bg-danger/15 text-danger rounded-pill text-body flex items-center gap-1.5 px-3.5 py-1.5 font-bold">
        <span aria-hidden className="bg-danger size-2 rounded-full" />
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
    <span className="bg-elevate-2 text-text-3 rounded-pill text-body px-3.5 py-1.5 font-bold">
      {label}
    </span>
  );
}

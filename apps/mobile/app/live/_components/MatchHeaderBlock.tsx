import {
  kickoffDateLabel,
  kickoffTimeLabel,
  matchStatusLabel,
  type MatchSummary,
} from "@plick/domain/live";
import { LiveCrest } from "./LiveCrest";

/**
 * 경기 상세 헤더 — 양 팀 크레스트 사이에 스코어(라이브·종료) 또는 킥오프
 * 시각(예정)을 크게 두고 아래 상태 칩을 단다(피그마 L5·L6·L9). 스코어 정본은
 * `header.score`다(이벤트 요약과 어긋나면 이쪽을 믿는 명세 규약).
 */
export function MatchHeaderBlock({ header }: { header: MatchSummary }) {
  return (
    <div className="px-edge flex items-start justify-between gap-3 pt-5 pb-4">
      <TeamSide team={header.home} />
      <div className="flex shrink-0 flex-col items-center gap-1.5 pt-1">
        {header.status === "SCHEDULED" || header.status === "POSTPONED" ? (
          <>
            <span className="text-headline text-text font-extrabold">
              {header.status === "POSTPONED"
                ? "연기"
                : kickoffTimeLabel(header.kickoffAt)}
            </span>
            <span className="text-caption text-text-4">
              {kickoffDateLabel(header.kickoffAt)}
            </span>
          </>
        ) : (
          <span className="text-headline text-text font-extrabold tracking-wide">
            {header.score.home ?? "-"} - {header.score.away ?? "-"}
          </span>
        )}
        <StatusChip header={header} />
      </div>
      <TeamSide team={header.away} />
    </div>
  );
}

function TeamSide({ team }: { team: MatchSummary["home"] }) {
  return (
    <div className="flex w-24 flex-col items-center gap-2">
      <LiveCrest team={team} size={48} />
      <span
        className={`text-label text-center font-semibold ${team.code ? "text-text" : "text-text-3"}`}
      >
        {team.name}
      </span>
    </div>
  );
}

/** 상태 칩 — 라이브는 danger 점 + 경과, 예정은 "킥오프 전", 종료는 FT 표기. */
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
    <span className="bg-elevate text-text-3 rounded-pill text-caption px-2.5 py-1 font-bold">
      {label}
    </span>
  );
}

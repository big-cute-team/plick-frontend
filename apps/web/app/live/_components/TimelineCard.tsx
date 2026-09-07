import type { MatchEvent, MatchSummary } from "@plick/domain/live";

/** 이벤트 종류 칩 — 모바일 타임라인과 같은 색 규약. */
const KIND_CHIP: Record<
  MatchEvent["type"],
  { label: string; className: string }
> = {
  GOAL: { label: "골", className: "bg-accent-tint text-accent" },
  SUB: { label: "교체", className: "bg-info-tint text-info" },
  CARD: { label: "경고", className: "bg-warn-tint text-warn" },
  VAR: { label: "VAR", className: "bg-info-tint text-info" },
};

/**
 * 상세 좌측의 타임라인 카드(피그마 LW4) — 최신 이벤트가 위. `playerName`
 * null 행은 부가 설명을 본문 자리로 올려 깨지지 않게 그린다(명세 함정).
 */
export function TimelineCard({
  header,
  events,
}: {
  header: MatchSummary;
  events: MatchEvent[];
}) {
  return (
    <section className="bg-elevate rounded-card flex flex-col p-5 pb-2.5">
      <h2 className="text-body text-text-2 pb-1.5 font-bold">타임라인</h2>
      {events.map((event, i) => {
        const chip = KIND_CHIP[event.type];
        const title = event.playerName ?? event.detail ?? "경기 이벤트";
        const sub = event.playerName ? event.detail : null;
        return (
          <div
            key={`${event.minute}-${i}`}
            className={`flex items-center gap-3 py-2.5 ${
              i > 0 ? "border-border border-t" : ""
            }`}
          >
            <span className="text-label text-text-3 w-10 shrink-0 font-bold">
              {event.minute}
            </span>
            <span
              className={`rounded-badge text-micro shrink-0 px-1.5 py-0.5 font-bold ${chip.className}`}
            >
              {chip.label}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-body text-text truncate font-semibold">
                {title}
              </span>
              {sub && (
                <span className="text-caption text-text-4 truncate">{sub}</span>
              )}
            </span>
            <span className="text-caption text-text-4 shrink-0 font-semibold">
              {event.side === "HOME"
                ? header.home.shortName
                : header.away.shortName}
            </span>
          </div>
        );
      })}
    </section>
  );
}

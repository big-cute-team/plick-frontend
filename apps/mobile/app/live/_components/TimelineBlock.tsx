import type { MatchEvent, MatchSummary } from "@plick/domain/live";

/** 이벤트 종류 칩의 라벨·색 — VAR·교체는 info, 경고는 warn, 퇴장은 danger, 골은 accent. */
const KIND_CHIP: Record<
  MatchEvent["type"],
  { label: string; className: string }
> = {
  GOAL: { label: "골", className: "bg-accent-tint text-accent" },
  SUB: { label: "교체", className: "bg-info-tint text-info" },
  CARD: { label: "경고", className: "bg-warn-tint text-warn" },
  RED_CARD: { label: "퇴장", className: "bg-danger/15 text-danger" },
  VAR: { label: "VAR", className: "bg-info-tint text-info" },
};

/**
 * 요약 탭의 타임라인 카드(피그마 L6) — 최신 이벤트가 위로 온다(경계 변환이
 * 뒤집어 준다). `playerName`이 null인 행(VAR 판정 등)은 부가 설명을 본문
 * 자리로 올려 이름 없이도 깨지지 않게 그린다(명세 함정 대응). 킥오프 직후처럼
 * 이벤트가 아직 없으면 안내 한 줄만 둔다.
 */
export function TimelineBlock({
  header,
  events,
}: {
  header: MatchSummary;
  events: MatchEvent[];
}) {
  return (
    <section className="bg-elevate rounded-card flex flex-col p-4 pb-2">
      <h2 className="text-body text-text-2 pb-1.5 font-bold">타임라인</h2>
      {events.length === 0 && (
        <p className="text-body text-text-4 py-6 text-center">
          아직 기록된 이벤트가 없어요
        </p>
      )}
      {events.map((event, i) => {
        const chip = KIND_CHIP[event.type];
        const title = event.playerName ?? event.detail ?? "경기 이벤트";
        const sub = event.playerName ? event.detail : null;
        return (
          <div
            key={`${event.minute}-${i}`}
            className={`flex items-center gap-2.5 py-2.5 ${
              i > 0 ? "border-border border-t" : ""
            }`}
          >
            <span className="text-label text-text-3 w-9 shrink-0 font-bold">
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

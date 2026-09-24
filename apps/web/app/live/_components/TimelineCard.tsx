import type { MatchEvent, MatchSummary } from "@plick/domain/live";

/** 이벤트 종류 라벨과 색 — 시안 규칙(골 강조색, 경고 warn, 퇴장 빨강, 나머지 보조색). */
const KIND: Record<MatchEvent["type"], { label: string; className: string }> = {
  GOAL: { label: "골", className: "text-accent" },
  SUB: { label: "교체", className: "text-text-3" },
  CARD: { label: "경고", className: "text-warn" },
  RED_CARD: { label: "퇴장", className: "text-danger" },
  VAR: { label: "VAR", className: "text-text-3" },
};

/**
 * 요약 탭의 타임라인 (KAN-462 → KAN-567 시안 경기 상세 889-919행). 가운데 1px 선을
 * 두고 `1fr 46px 1fr` 행에 분 배지(bg-chip 11/700 각진)를 가운데, 홈 이벤트는 왼쪽
 * 오른정렬, 원정 이벤트는 오른쪽에 둔다. 종류 라벨 11.5/700 + 선수 13.5다. 최신
 * 이벤트가 위(경계 변환이 뒤집어 준다). `playerName` null 행은 부가 설명을 이름
 * 자리로 올려 깨지지 않게 그린다(명세 함정). 이벤트가 아직 없으면 안내 한 줄만 둔다.
 */
export function TimelineCard({
  header,
  events,
}: {
  header: MatchSummary;
  events: MatchEvent[];
}) {
  return (
    <div>
      <p className="text-body-md text-text-strong pt-4.5 pb-2.5 font-black">
        타임라인
      </p>
      {events.length === 0 ? (
        <p className="text-body-md text-text-4 py-6">
          아직 기록된 이벤트가 없어요
        </p>
      ) : (
        <div className="relative">
          <div
            aria-hidden
            className="bg-border absolute top-0 bottom-0 left-1/2 w-px"
          />
          {events.map((event, i) => {
            const kind = KIND[event.type];
            const name = event.playerName ?? event.detail ?? "경기 이벤트";
            const sub = event.playerName ? event.detail : null;
            const home = event.side === "HOME";
            const body = (
              <span
                className={`inline-flex items-baseline gap-1.75 ${home ? "" : "flex-row-reverse"}`}
                title={sub ?? undefined}
              >
                <span className={`text-caption-lg font-bold ${kind.className}`}>
                  {kind.label}
                </span>
                <span
                  className={`text-body text-text-strong ${event.type === "GOAL" ? "font-bold" : "font-medium"}`}
                >
                  {name}
                </span>
                {sub && (
                  <span className="text-caption-lg text-text-4 max-lg:hidden">
                    {sub}
                  </span>
                )}
              </span>
            );
            return (
              <div
                key={`${event.minute}-${i}`}
                className="relative grid grid-cols-[1fr_46px_1fr] items-center py-2.25"
              >
                <div className="min-w-0 pr-4 text-right">{home && body}</div>
                <div className="flex justify-center">
                  <span className="bg-chip text-caption text-text-2 inline-flex h-5 min-w-8 items-center justify-center px-1.5 font-bold">
                    {event.minute}
                  </span>
                </div>
                <div className="min-w-0 pl-4">{!home && body}</div>
              </div>
            );
          })}
        </div>
      )}
      <span className="sr-only">
        {header.home.name} 대 {header.away.name}
      </span>
    </div>
  );
}

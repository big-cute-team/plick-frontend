import type { MatchEvent, MatchSummary } from "@plick/domain/live";

/** 이벤트 종류 라벨과 색. 시안 `kindColor`: 골은 강조색, 경고는 warn, 퇴장은 빨강, 나머지 보조색 */
const KIND_LABEL: Record<
  MatchEvent["type"],
  { label: string; className: string }
> = {
  GOAL: { label: "골", className: "text-accent" },
  SUB: { label: "교체", className: "text-text-3" },
  CARD: { label: "경고", className: "text-warn" },
  RED_CARD: { label: "퇴장", className: "text-danger" },
  VAR: { label: "VAR", className: "text-text-3" },
};

/**
 * 요약 탭의 타임라인 (시안 KAN-567). 제목 "타임라인" 15/900 아래 가운데 세로 1px
 * 선을 두고 이벤트마다 가운데 분 배지(min-w 32, h 20, radius 6, 칩 면), 홈은 왼쪽
 * 정렬(종류 라벨 + 선수), 원정은 오른쪽 정렬(선수 + 종류 라벨)이다. 골은 선수를
 * 900으로 세운다. 최신 이벤트가 위로 온다(경계 변환이 뒤집어 준다).
 *
 * `playerName`이 null인 행(VAR 판정 등)은 부가 설명을 본문 자리로 올려 이름 없이도
 * 깨지지 않게 그린다(명세 함정 대응). 킥오프 직후처럼 이벤트가 아직 없으면 안내
 * 한 줄만 둔다.
 *
 * @param header 경기 헤더(어느 팀인지는 `side`로 갈라 헤더는 쓰지 않지만 규약상 받는다)
 * @param events 타임라인 이벤트
 */
export function TimelineBlock({
  events,
}: {
  header: MatchSummary;
  events: MatchEvent[];
}) {
  return (
    <section>
      <h2 className="text-body-lg text-text-strong tracking-section pt-4.5 pb-2 font-black">
        타임라인
      </h2>
      {events.length === 0 ? (
        <p className="text-body text-text-4 py-6 text-center">
          아직 기록된 이벤트가 없어요
        </p>
      ) : (
        <div className="relative">
          <span
            aria-hidden
            className="bg-border absolute top-0 bottom-0 left-1/2 w-px"
          />
          {events.map((event, i) => {
            const kind = KIND_LABEL[event.type];
            const name = event.playerName ?? event.detail ?? "경기 이벤트";
            const strong = event.type === "GOAL";
            const label = (
              <span
                className={`text-caption shrink-0 font-bold ${kind.className}`}
              >
                {kind.label}
              </span>
            );
            const player = (
              <span
                className={`text-body text-text-strong min-w-0 truncate ${
                  strong ? "font-black" : "font-medium"
                }`}
              >
                {name}
              </span>
            );
            return (
              <div
                key={`${event.minute}-${i}`}
                className="relative grid grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)] items-center py-2.25"
              >
                <div className="flex justify-end pr-2.5">
                  {event.side === "HOME" && (
                    <span className="flex min-w-0 items-baseline gap-1.5">
                      {label}
                      {player}
                    </span>
                  )}
                </div>
                <div className="flex justify-center">
                  <span className="bg-chip rounded-badge text-caption text-text-2 inline-flex h-5 min-w-8 items-center justify-center px-1.25 font-bold">
                    {event.minute}
                  </span>
                </div>
                <div className="flex pl-2.5">
                  {event.side === "AWAY" && (
                    <span className="flex min-w-0 items-baseline gap-1.5">
                      {player}
                      {label}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

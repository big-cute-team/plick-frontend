import type { MatchGoal, MatchSummary } from "@plick/domain/live";

/**
 * 요약 탭의 득점 카드(피그마 L6) — BE 득점 요약(시간순, 취소 골 제외)을 홈은
 * 왼쪽, 어웨이는 오른쪽 정렬로 그린다. 골이 없으면 카드 자체를 그리지 않는다.
 */
export function GoalsBlock({
  header,
  goals,
}: {
  header: MatchSummary;
  goals: MatchGoal[];
}) {
  if (goals.length === 0) return null;

  return (
    <section className="bg-elevate rounded-card flex flex-col gap-2.5 p-4">
      <h2 className="text-body text-text-2 font-bold">득점</h2>
      {goals.map((goal, i) => (
        <p
          key={`${goal.minute}-${i}`}
          className={`flex items-center gap-2 ${goal.side === "AWAY" ? "justify-end" : ""}`}
        >
          <span aria-hidden className="bg-accent size-1.5 rounded-full" />
          <span className="text-label text-text-3 font-bold">
            {goal.minute}
          </span>
          <span className="text-body text-text font-semibold">
            {goal.playerName}
          </span>
          {goal.detail && (
            <span className="text-caption text-text-4">({goal.detail})</span>
          )}
        </p>
      ))}
      <p className="text-caption text-text-4 sr-only">
        {header.home.name} {header.score.home} - {header.score.away}{" "}
        {header.away.name}
      </p>
    </section>
  );
}

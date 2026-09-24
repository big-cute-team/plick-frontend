import type { MatchGoal, MatchSummary } from "@plick/domain/live";

/**
 * 요약 탭의 득점자 두 칼럼 (시안 KAN-567). 왼쪽은 홈, 오른쪽은 원정(오른쪽 정렬)
 * 이고 한 줄은 선수 13/700에 분 11.5 보조색, 페널티 같은 부가 표기는 11 회색이다.
 * 아래에 행 구분선이 깔린다. BE 득점 요약(시간순, 취소 골 제외)을 그대로 쓰고
 * 골이 없으면 블록 자체를 그리지 않는다.
 *
 * @param header 경기 헤더(접근성용 스코어 한 줄)
 * @param goals 득점 요약
 */
export function GoalsBlock({
  header,
  goals,
}: {
  header: MatchSummary;
  goals: MatchGoal[];
}) {
  if (goals.length === 0) return null;
  const home = goals.filter((goal) => goal.side === "HOME");
  const away = goals.filter((goal) => goal.side === "AWAY");

  return (
    <section className="border-border-soft flex gap-4 border-b pt-4 pb-3">
      <div className="min-w-0 flex-1">
        {home.map((goal, i) => (
          <p
            key={`${goal.minute}-${i}`}
            className="flex items-baseline gap-1.5 pb-1.5"
          >
            <span className="text-body text-text-strong min-w-0 truncate font-bold">
              {goal.playerName}
            </span>
            <span className="text-caption-lg text-text-3 shrink-0">
              {goal.minute}
            </span>
            {goal.detail && (
              <span className="text-caption text-text-4 shrink-0">
                {goal.detail}
              </span>
            )}
          </p>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        {away.map((goal, i) => (
          <p
            key={`${goal.minute}-${i}`}
            className="flex items-baseline justify-end gap-1.5 pb-1.5"
          >
            {goal.detail && (
              <span className="text-caption text-text-4 shrink-0">
                {goal.detail}
              </span>
            )}
            <span className="text-caption-lg text-text-3 shrink-0">
              {goal.minute}
            </span>
            <span className="text-body text-text-strong min-w-0 truncate font-bold">
              {goal.playerName}
            </span>
          </p>
        ))}
      </div>
      <p className="sr-only">
        {header.home.name} {header.score.home} - {header.score.away}{" "}
        {header.away.name}
      </p>
    </section>
  );
}

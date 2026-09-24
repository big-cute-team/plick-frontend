import type { MatchGoal } from "@plick/domain/live";

/**
 * 요약 탭의 득점자 (KAN-462 → KAN-567 시안 경기 상세 862-887행). 홈은 왼쪽, 원정은
 * 오른쪽 열에 선수 13.5/700 + 분 12 보조색 + 부가 표기(자책, PK) 11.5로 쌓고 아래를
 * 목록 구분선으로 끊는다. 골이 없으면 그리지 않는다. 선수 프로필 연결은 라이브
 * 선수와 인물 사전이 아직 이어져 있지 않아 글자로만 둔다.
 */
export function GoalsCard({ goals }: { goals: MatchGoal[] }) {
  if (goals.length === 0) return null;
  const home = goals.filter((goal) => goal.side === "HOME");
  const away = goals.filter((goal) => goal.side === "AWAY");

  return (
    <div className="border-border-soft flex gap-10 border-b pt-4.5 pb-5">
      <div className="min-w-0 flex-1">
        {home.map((goal, i) => (
          <GoalLine key={`${goal.minute}-${i}`} goal={goal} />
        ))}
      </div>
      <div className="min-w-0 flex-1 text-right">
        {away.map((goal, i) => (
          <GoalLine key={`${goal.minute}-${i}`} goal={goal} away />
        ))}
      </div>
    </div>
  );
}

function GoalLine({ goal, away = false }: { goal: MatchGoal; away?: boolean }) {
  return (
    <p
      className={`flex items-baseline gap-2 pb-1.75 ${away ? "flex-row-reverse" : ""}`}
    >
      <span className="text-body text-text-strong font-bold">
        {goal.playerName}
      </span>
      <span className="text-label text-text-3">{goal.minute}</span>
      {goal.detail && (
        <span className="text-caption-lg text-text-4">{goal.detail}</span>
      )}
    </p>
  );
}

import type { MatchSummary } from "@plick/domain/live";
import { MatchRow } from "./MatchRow";

/**
 * 하루치 경기 목록 (시안 KAN-567). 행을 그대로 쌓는다. 대회별 그룹 헤더는
 * 시안에 없어 대회가 하나면 그리지 않고, 프리미어리그와 컵 경기가 섞인 날처럼
 * 둘 이상일 때만 작은 회색 라벨을 그룹 위에 둔다. 그룹 키는 대회 id(BE 권고)이고
 * 등장 순서는 데이터 순서(킥오프 오름차순)를 따른다.
 *
 * @param matches 그 날짜의 경기 목록
 */
export function MatchDayList({ matches }: { matches: MatchSummary[] }) {
  const groups: {
    id: number;
    competition: string;
    matches: MatchSummary[];
  }[] = [];
  for (const match of matches) {
    const last = groups[groups.length - 1];
    if (last?.id === match.competitionId) last.matches.push(match);
    else {
      groups.push({
        id: match.competitionId,
        competition: match.competition,
        matches: [match],
      });
    }
  }

  return (
    <div className="px-edge flex flex-col">
      {groups.map((group) => (
        <section key={group.id} className="flex flex-col">
          {groups.length > 1 && (
            <h2 className="text-micro-lg text-text-4 pt-3 pb-0.5">
              {group.competition}
            </h2>
          )}
          {group.matches.map((match) => (
            <MatchRow key={match.id} match={match} />
          ))}
        </section>
      ))}
    </div>
  );
}

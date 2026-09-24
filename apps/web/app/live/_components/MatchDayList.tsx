import type { MatchSummary } from "@plick/domain/live";
import { MatchRow } from "./MatchRow";

/**
 * 하루치 경기 목록 (KAN-567 시안 LIVE 758-781행). 대회별로 묶어 작은 대회명 줄 아래
 * 행을 쌓는다. 그룹 키는 대회 id, 순서는 데이터 순서(모바일과 같은 규약). 시안은
 * 프리미어리그 한 대회만 그려 대회 줄이 없지만 실데이터는 여러 대회가 섞여 와서
 * 11.5 보조색 한 줄로만 남긴다.
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
    <div className="flex flex-col gap-3.5">
      {groups.map((group) => (
        <section key={group.id}>
          <h2 className="text-caption-lg text-text-3 px-2 pt-3 pb-1 font-bold">
            {group.competition}
          </h2>
          {group.matches.map((match) => (
            <MatchRow key={match.id} match={match} />
          ))}
        </section>
      ))}
    </div>
  );
}

import type { MatchSummary } from "@plick/domain/live";
import { MatchCard } from "./MatchCard";

/**
 * 하루치 경기 목록 — 대회별로 그룹핑해 그룹 헤더(악센트 바 + 대회명) 아래
 * 카드를 쌓는다(피그마 L1). 그룹 키는 대회 id(BE 권고)이고 등장 순서는
 * 데이터 순서(킥오프 오름차순)를 따른다.
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
    <div className="px-edge flex flex-col gap-3 pt-2">
      {groups.map((group) => (
        <section key={group.id} className="flex flex-col gap-2">
          <h2 className="flex items-center gap-1.5">
            <span aria-hidden className="bg-accent h-3 w-0.5 rounded-full" />
            <span className="text-label text-text-3 font-bold">
              {group.competition}
            </span>
          </h2>
          {group.matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </section>
      ))}
      <p className="text-caption text-text-4 pt-1 pb-4 text-center">
        라이브 경기는 20~30초마다 자동 갱신돼요
      </p>
    </div>
  );
}

import type { Team } from "@plick/domain/types";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { TeamShieldIcon } from "@plick/ui/icons";

/**
 * MY 응원팀 목록 카드 (KAN-319, 모바일 이식) — 응원팀이 다중 선택이라 배지 하나가
 * 아니라 목록으로 보여준다. 팀마다 구단 로고(`TeamCrest`) + 이름 칩, 없으면 빈 상태 문구.
 * 표시 전용이라 모바일과 마크업이 같지만, 화면 표현은 앱별 유지 원칙(ADR 0011)대로
 * 승격하지 않는다.
 *
 * @param teams - 응원팀 레지스트리 항목 목록 (비어 있을 수 있음)
 */
export function FavoriteTeamsCard({ teams }: { teams: Team[] }) {
  return (
    <section className="bg-elevate-2 border-border rounded-card border p-4">
      <div className="gap-gap flex items-center">
        <span className="bg-elevate rounded-tile text-icon grid size-8 shrink-0 place-items-center">
          <TeamShieldIcon />
        </span>
        <span className="text-body text-text font-bold">응원팀</span>
      </div>

      {teams.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {teams.map((team) => (
            <li
              key={team.code}
              className="bg-elevate border-border rounded-pill flex items-center gap-1.5 border py-1.5 pr-3 pl-2"
            >
              <TeamCrest team={team} size={18} />
              <span className="text-label text-text font-bold">
                {team.name}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-label text-text-4 mt-3">아직 응원팀이 없어요</p>
      )}
    </section>
  );
}

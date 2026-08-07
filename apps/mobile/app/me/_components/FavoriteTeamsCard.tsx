import Link from "next/link";
import type { Team } from "@plick/domain/types";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { TeamShieldIcon } from "@plick/ui/icons";

/**
 * MY 응원팀 목록 카드 — 응원팀이 다중 선택이라 배지 하나가 아니라 목록으로 보여준다.
 * 팀마다 구단 로고(`TeamCrest`) + 이름 칩, 없으면 빈 상태 문구.
 * 헤더 우측 "수정하기"로 프로필 카드와 같은 수정 화면(`/me/edit`)에 진입한다(KAN-379).
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
        <span className="text-body text-text min-w-0 flex-1 font-bold">
          응원팀
        </span>
        <Link
          href="/me/edit"
          className="text-label text-accent shrink-0 font-semibold active:opacity-60"
        >
          수정하기
        </Link>
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

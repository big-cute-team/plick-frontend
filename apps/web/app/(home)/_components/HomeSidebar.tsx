import Link from "next/link";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { TEAMS } from "@plick/domain/constants";
import { CURRENT_USER, TRENDING_POSTS } from "@/_lib/mock";

/**
 * 홈 우측 사이드바 — 마이팀 카드 + 실시간 인기 랭킹. 스크롤 시 상단에 고정된다.
 *
 * @param className - 래퍼에 덧붙일 클래스(모바일에서 `hidden`으로 감추는 등)
 */
export function HomeSidebar({ className = "" }: { className?: string }) {
  const myTeam = TEAMS[CURRENT_USER.myTeam];

  return (
    <aside className={`sticky top-22 flex-col gap-4 self-start ${className}`}>
      <section className="bg-elevate-2 border-border rounded-card gap-gap-lg p-edge flex items-center border">
        <TeamCrest team={myTeam} size={44} />
        <div className="min-w-0 flex-1">
          <p className="text-body-lg text-text font-extrabold">{myTeam.name}</p>
          <p className="text-label text-text-3">마이팀 소식을 가장 먼저</p>
        </div>
        <span className="bg-accent-tint text-accent text-label rounded-pill shrink-0 px-3 py-1.5 font-extrabold">
          MY팀
        </span>
      </section>

      <section className="bg-elevate-2 border-border rounded-card p-edge border">
        <h3 className="text-gnb text-text pb-1.5 font-extrabold">
          실시간 인기
        </h3>
        <ol>
          {TRENDING_POSTS.map((post, i) => (
            <li
              key={post.id}
              className="border-border border-b last:border-b-0"
            >
              <Link
                href={`/articles/${post.id}`}
                className="group focus-visible:outline-accent flex items-start py-2.5 focus-visible:outline-2 focus-visible:-outline-offset-2"
              >
                <span className="text-tab text-accent w-7 shrink-0">
                  {i + 1}
                </span>
                <span className="text-body text-text group-hover:text-accent line-clamp-2 min-w-0 flex-1 transition-colors">
                  {post.title}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </aside>
  );
}

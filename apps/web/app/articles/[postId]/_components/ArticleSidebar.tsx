import Link from "next/link";
import { MediaThumb } from "@plick/ui/MediaThumb";
import { TEAMS } from "@/_lib/constants";
import type { FeedPost } from "@/_lib/types";

/**
 * 기사 세부 우측 사이드바 — 관련 기사 카드 + 실시간 인기 랭킹. 스크롤 시 상단 고정.
 *
 * `lg` 미만에선 숨긴다(홈 HomeSidebar와 동일). 하단 "함께 보면 좋은 기사" 행이
 * 모바일에서 관련 콘텐츠를 대신 제공한다.
 *
 * @param related - 관련 기사 목록
 * @param trending - 실시간 인기 랭킹 목록
 * @param className - 래퍼에 덧붙일 클래스(모바일 `hidden lg:flex` 제어)
 */
export function ArticleSidebar({
  related,
  trending,
  className = "",
}: {
  related: FeedPost[];
  trending: FeedPost[];
  className?: string;
}) {
  return (
    <aside className={`sticky top-22 flex-col gap-4 self-start ${className}`}>
      <section className="bg-elevate-2 border-border rounded-card border p-3.5">
        <h3 className="text-gnb text-text px-1 pb-1 font-extrabold">
          관련 기사
        </h3>
        <ul>
          {related.map((post) => (
            <li
              key={post.id}
              className="border-border border-b last:border-b-0"
            >
              <Link
                href={`/articles/${post.id}`}
                className="group focus-visible:outline-accent flex items-center gap-2.5 rounded-md px-1 py-2.5 focus-visible:outline-2 focus-visible:-outline-offset-2"
              >
                <MediaThumb
                  colorVar={TEAMS[post.team].colorVar}
                  className="rounded-tile aspect-[7/5] w-22 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-body text-text group-hover:text-accent line-clamp-2 leading-snug font-bold transition-colors">
                    {post.title}
                  </p>
                  <p className="text-caption text-text-3 mt-1">
                    {post.reporter.name} · {post.timeLabel}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-elevate-2 border-border rounded-card border p-3.5">
        <h3 className="text-gnb text-text pb-1 font-extrabold">실시간 인기</h3>
        <ol>
          {trending.map((post, i) => (
            <li
              key={post.id}
              className="border-border border-b last:border-b-0"
            >
              <Link
                href={`/articles/${post.id}`}
                className="group focus-visible:outline-accent flex items-start py-2.5 focus-visible:outline-2 focus-visible:-outline-offset-2"
              >
                <span className="text-tab text-accent w-5 shrink-0 font-semibold">
                  {i + 1}
                </span>
                <span className="text-body text-text group-hover:text-accent line-clamp-2 min-w-0 flex-1 leading-snug transition-colors">
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

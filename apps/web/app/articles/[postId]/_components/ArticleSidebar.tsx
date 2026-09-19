import Link from "next/link";
import { formatRelativeTime } from "@plick/domain/format";
import type { ArticleCard, HotArticle } from "@plick/domain/types";
import { TrendingSection } from "@/_components/TrendingSection";

/**
 * 기사 세부 우측 사이드바 — 관련 기사 + 실시간 인기 랭킹. 스크롤 시 상단 고정.
 *
 * `lg` 미만에선 숨긴다(홈 HomeSidebar와 동일). 하단 "함께 보면 좋은 기사" 행이
 * 모바일에서 관련 콘텐츠를 대신 제공한다.
 *
 * 계약 공백으로 준비 중 문구만 두던 자리를 KAN-338에서 채웠다. 관련 기사는
 * 전용 추천 API 대신 기사의 팀태그로 팀 필터 목록을 받아 5개를 보여주고
 * (`getRelatedArticles`), 실시간 인기는 홈과 같은 핫이슈 데이터를 쓴다
 * (`TrendingSection` 공용).
 *
 * @param related - 관련 기사 목록. 로드 실패면 null. 팀태그가 없거나 같은 팀
 *   기사가 더 없으면 빈 배열 — 빈 문구를 그린다.
 * @param hot - 핫이슈 목록. 로드 실패면 null.
 * @param className - 래퍼에 덧붙일 클래스(모바일 `hidden lg:flex` 제어)
 */
export function ArticleSidebar({
  related,
  hot,
  className = "",
}: {
  related: ArticleCard[] | null;
  hot: HotArticle[] | null;
  className?: string;
}) {
  return (
    <aside className={`sticky top-22 flex-col gap-4 self-start ${className}`}>
      <section className="bg-elevate-2 border-border rounded-card p-edge border">
        <h3 className="text-gnb text-text pb-1.5 font-extrabold">관련 기사</h3>
        {related === null ? (
          <p className="text-body text-text-4 py-4 text-center">
            관련 기사를 불러오지 못했어요.
          </p>
        ) : related.length === 0 ? (
          <p className="text-body text-text-4 py-4 text-center">
            관련 기사가 아직 없어요.
          </p>
        ) : (
          <ul>
            {related.map((article) => (
              <li
                key={article.id}
                className="border-border border-b last:border-b-0"
              >
                <Link
                  href={`/articles/${article.id}`}
                  className="group focus-visible:outline-accent flex flex-col gap-1 py-2.5 focus-visible:outline-2 focus-visible:-outline-offset-2"
                >
                  <span className="text-body text-text group-hover:text-accent line-clamp-2 transition-colors">
                    {article.title}
                  </span>
                  <span
                    className="text-caption text-text-4"
                    suppressHydrationWarning
                  >
                    {formatRelativeTime(article.publishedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <TrendingSection articles={hot} />
    </aside>
  );
}

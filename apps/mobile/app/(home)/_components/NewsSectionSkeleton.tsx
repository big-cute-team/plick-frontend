import { ARTICLES_PAGE_SIZE } from "@plick/core/articles";
import { NewsItemSkeleton } from "@/_components/NewsItemSkeleton";

/**
 * "지금 올라온 소식" 섹션의 로딩 자리 (KAN-602). 제목은 실물, 팀 탭 줄은 칩 자리,
 * 리스트는 `NewsFeed`가 첫 페이지를 기다릴 때와 같은 개수의 행 스켈레톤이다.
 */
export function NewsSectionSkeleton() {
  return (
    <section aria-hidden className="pt-5">
      <h2 className="text-body-lg text-text-strong tracking-section px-edge pb-2 font-black">
        지금 올라온 소식
      </h2>
      <div className="px-edge flex animate-pulse gap-3 py-2.25">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="bg-elevate rounded-pill h-4 w-10" />
        ))}
      </div>
      <div className="px-edge">
        {Array.from({ length: ARTICLES_PAGE_SIZE }, (_, i) => (
          <NewsItemSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

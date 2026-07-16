import type { FeedPost } from "@/_lib/types";
import { SuggestedArticleCard } from "./SuggestedArticleCard";

/**
 * 기사 세부 하단 "함께 보면 좋은 기사" 섹션 — 데스크톱 3열 미디어 카드 행.
 *
 * 데스크톱은 3열, `lg` 미만(태블릿·모바일)에선 1열로 스택해 좁은 폭에서도
 * 카드가 찌그러지지 않게 한다.
 *
 * @param posts - 추천 기사 목록(현재 기사를 제외한 3개)
 */
export function SuggestedArticles({ posts }: { posts: FeedPost[] }) {
  return (
    <section className="mt-11">
      <h2 className="text-section text-text tracking-heading font-extrabold">
        함께 보면 좋은 기사
      </h2>
      <div className="mt-3.5 grid grid-cols-1 gap-3.5 lg:grid-cols-3">
        {posts.map((post) => (
          <SuggestedArticleCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}

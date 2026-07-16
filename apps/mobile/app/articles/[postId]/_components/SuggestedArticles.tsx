import type { FeedPost } from "@/_lib/types";
import { SuggestedArticleItem } from "./SuggestedArticleItem";

/**
 * 기사 세부 하단 "함께 보면 좋은 기사" 섹션 — 상단 구분선 + 컴팩트 행 리스트.
 *
 * @param posts - 추천 기사 목록(현재 기사를 제외한 3개)
 */
export function SuggestedArticles({ posts }: { posts: FeedPost[] }) {
  return (
    <section className="px-edge border-border mt-3.5 border-t pt-4">
      <h2 className="text-title text-text tracking-heading font-extrabold">
        함께 보면 좋은 기사
      </h2>
      <div className="mt-1">
        {posts.map((post) => (
          <SuggestedArticleItem key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}

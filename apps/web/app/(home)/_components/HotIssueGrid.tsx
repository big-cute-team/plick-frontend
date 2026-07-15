import type { FeedPost } from "@/_lib/types";
import { HotCard } from "./HotCard";

/**
 * 핫이슈 그리드 — 좌측 히어로(2fr) + 우측 서브 카드 2장(1fr) 데스크톱 배치.
 *
 * 히어로는 우측 스택 높이에 맞춰 늘어난다(그리드 stretch).
 */
export function HotIssueGrid({ posts }: { posts: FeedPost[] }) {
  const [hero, ...subs] = posts;
  return (
    <div className="gap-gap-lg grid grid-cols-[2fr_1fr]">
      {hero && <HotCard post={hero} size="lg" />}
      <div className="gap-gap-lg flex flex-col">
        {subs.slice(0, 2).map((post) => (
          <HotCard key={post.id} post={post} size="sm" />
        ))}
      </div>
    </div>
  );
}

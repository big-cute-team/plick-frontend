import type { FeedPost } from "@plick/domain/types";
import { HotCard } from "./HotCard";

/**
 * 핫이슈 그리드 — 좌측 히어로(2fr) + 우측 서브 카드 2장(1fr) 데스크톱 배치.
 *
 * 히어로는 우측 스택 높이에 맞춰 늘어난다(그리드 stretch).
 * 모바일(lg 미만)에선 히어로 한 장만 보이고 서브 스택은 숨긴다.
 */
export function HotIssueGrid({ posts }: { posts: FeedPost[] }) {
  const [hero, ...subs] = posts;
  return (
    <div className="gap-gap-lg grid grid-cols-1 lg:grid-cols-[2fr_1fr]">
      {hero && <HotCard post={hero} size="lg" />}
      <div className="gap-gap-lg hidden flex-col lg:flex">
        {subs.slice(0, 2).map((post) => (
          <HotCard key={post.id} post={post} size="sm" />
        ))}
      </div>
    </div>
  );
}

import type { FeedPost } from "../_lib/types";
import { HotHeroCard } from "./HotHeroCard";

// 가로 스냅 캐러셀. 카드 폭 82%로 다음 카드가 살짝 보여 스와이프를 유도.
// CSS scroll-snap이라 JS 없이 어떤 기기에서도 동작.
export function HotCarousel({ posts }: { posts: FeedPost[] }) {
  return (
    <div className="snap-x-carousel no-scrollbar gap-gap px-screen flex overflow-x-auto pb-2">
      {posts.map((post) => (
        <div
          key={post.id}
          className="aspect-[16/11] w-[82%] shrink-0 snap-start"
        >
          <HotHeroCard post={post} />
        </div>
      ))}
    </div>
  );
}

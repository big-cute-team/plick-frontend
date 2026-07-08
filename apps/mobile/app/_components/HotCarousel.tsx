"use client";

import { useRef, useState } from "react";
import type { FeedPost } from "../_lib/types";
import { HotHeroCard } from "./HotHeroCard";

// 가로 스냅 캐러셀 + 하단 점 인디케이터.
// 카드 폭 82%로 다음 카드가 살짝 보여 스와이프를 유도. CSS scroll-snap이라 어떤 기기에서도 동작.
export function HotCarousel({ posts }: { posts: FeedPost[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  function onScroll() {
    const el = trackRef.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return;
    const step = first.clientWidth + 12; // 카드폭 + gap
    const i = Math.round(el.scrollLeft / step);
    setActive(Math.max(0, Math.min(posts.length - 1, i)));
  }

  return (
    <div>
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="snap-x-carousel no-scrollbar gap-gap px-screen flex overflow-x-auto pb-2"
      >
        {posts.map((post) => (
          <div
            key={post.id}
            className="aspect-[16/11] w-[82%] shrink-0 snap-start"
          >
            <HotHeroCard post={post} />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-1 pt-1">
        {posts.map((post, i) => (
          <span
            key={post.id}
            className={
              i === active
                ? "bg-accent rounded-pill h-1 w-3"
                : "rounded-pill bg-text-4/40 size-1"
            }
          />
        ))}
      </div>
    </div>
  );
}

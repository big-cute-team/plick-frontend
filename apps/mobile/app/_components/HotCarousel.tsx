"use client";

import { useRef, useState } from "react";
import type { FeedPost } from "../_lib/types";
import { HotHeroCard } from "./HotHeroCard";

// 센터 스냅 캐러셀 + 하단 점 인디케이터.
// 카드 폭 86%, 좌우 스페이서(7% - gap)로 첫/마지막 카드까지 정확히 화면 중앙에 스냅.
// (좌우 패딩 방식은 카드가 '패딩 뺀 영역'의 %라 끝단이 중앙까지 못 가는 문제가 있음)
const CARD_W = 0.86;
const GAP = 10;

export function HotCarousel({ posts }: { posts: FeedPost[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  function onScroll() {
    const el = trackRef.current;
    if (!el) return;
    const step = el.clientWidth * CARD_W + GAP; // 카드폭 + gap
    const i = Math.round(el.scrollLeft / step);
    setActive(Math.max(0, Math.min(posts.length - 1, i)));
  }

  return (
    <div>
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="snap-x-carousel no-scrollbar flex gap-2.5 overflow-x-auto pb-2"
      >
        <div aria-hidden className="w-[calc(7%-10px)] shrink-0" />
        {posts.map((post) => (
          <div
            key={post.id}
            className="aspect-[181/131] w-[86%] shrink-0 snap-center"
          >
            <HotHeroCard post={post} />
          </div>
        ))}
        <div aria-hidden className="w-[calc(7%-10px)] shrink-0" />
      </div>
      <div className="flex items-center justify-center gap-1 pt-1">
        {posts.map((post, i) => (
          <span
            key={post.id}
            className={
              i === active
                ? "bg-accent rounded-pill h-1 w-3"
                : "bg-text-4/40 rounded-pill size-1"
            }
          />
        ))}
      </div>
    </div>
  );
}
